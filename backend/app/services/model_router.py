from pathlib import Path
import hashlib
import html
import json
import math
import re
import textwrap
from base64 import b64decode

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.services.topic_intent import first_matching_topic_intent, is_water_ranking_topic


PROMPT_ROOT = Path(__file__).resolve().parents[3] / "prompts"
GENERATED_ASSET_ROOT = Path(__file__).resolve().parents[2] / "static" / "generated"
TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)
FILENAME_RE = re.compile(r"[^a-zA-Z0-9_-]+")
IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO = {
    "1:1": (1080, 1080),
    "3:4": (2048, 2736),
    "4:5": (1080, 1350),
    "9:16": (900, 1600),
}
IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO = {
    "1:1": "1024x1024",
    "3:4": "2048x2736",
    "4:5": "1024x1280",
    "9:16": "1024x1820",
}
DEFAULT_XIAOHONGSHU_IMAGE_SIZE = IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO["3:4"]


def load_prompt(name: str) -> str:
    prompt_path = PROMPT_ROOT / f"{name}.md"
    if not prompt_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"缺少提示词模板：{name}",
        )
    return prompt_path.read_text(encoding="utf-8")


def load_platform_style_reference(platform: object) -> str:
    normalized_platform = str(platform or "").strip().lower()
    if normalized_platform == "xiaohongshu":
        return load_prompt("xiaohongshu_style_reference")
    return ""


def _redacted_provider_error(provider: str, status_code: int | None = None) -> str:
    provider_label = {
        "OpenAI-compatible draft provider": "撰稿服务",
        "OpenAI-compatible image provider": "图片服务",
        "DeepSeek": "改写服务",
    }.get(provider, "模型服务")
    if status_code in {401, 403}:
        return f"{provider_label}授权失败，请检查设置里的服务授权和服务地址。"
    if status_code == 404:
        return f"{provider_label}服务地址不可用，请检查设置里的服务配置和服务地址。"
    if status_code == 429:
        return f"{provider_label}请求过于频繁或额度不足，请稍后重试或检查账户额度。"
    if status_code is not None:
        return f"{provider_label}请求失败（HTTP {status_code}），请检查服务配置。"
    return f"{provider_label}请求失败，请检查服务配置和网络。"


def _provider_display_label(provider: str) -> str:
    return {
        "OpenAI-compatible draft provider": "撰稿服务",
        "OpenAI-compatible image provider": "图片服务",
        "DeepSeek": "改写服务",
    }.get(provider, "模型服务")


def _provider_response_shape_error(provider: str, problem: str) -> str:
    provider_label = _provider_display_label(provider)
    return f"{provider_label}返回格式异常：{problem}。请检查模型类型、服务地址和响应格式。"


def _redacted_provider_error_from_response(
    provider: str,
    response: httpx.Response,
) -> str:
    provider_label = _provider_display_label(provider)
    status_code = response.status_code
    error_code = ""
    error_message = ""

    try:
        data = response.json()
    except ValueError:
        data = None

    if isinstance(data, dict):
        raw_code = data.get("code")
        raw_message = data.get("message")
        raw_error = data.get("error")
        if isinstance(raw_error, dict):
            raw_code = raw_code or raw_error.get("code") or raw_error.get("type")
            raw_message = raw_message or raw_error.get("message")
        error_code = str(raw_code or "").upper()
        error_message = str(raw_message or "").lower()

    if status_code in {401, 403} and (
        "INVALID_API_KEY" in error_code or "invalid api key" in error_message
    ):
        return f"{provider_label}授权无效，请在设置页更换有效授权后重新检测。"

    if status_code == 400 and "invalid size" in error_message:
        return (
            f"{provider_label}不支持当前图片尺寸；请使用宽高均为 16 倍数的 2K 尺寸，"
            "例如 2048x2736。"
        )

    return _redacted_provider_error(provider, status_code)


def _redacted_provider_timeout(provider: str, timeout_seconds: float) -> str:
    provider_label = _provider_display_label(provider)
    timeout_text = f"{timeout_seconds:g}"
    return (
        f"{provider_label}响应超时（超过 {timeout_text} 秒）。"
        "请稍后重试；如果反复出现，请降低输出长度或更换可用服务配置/服务地址。"
    )


def _deepseek_messages(prompt_template: str, payload: dict[str, object]) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": prompt_template,
        },
        {
            "role": "user",
            "content": json.dumps(payload, ensure_ascii=False, indent=2),
        },
    ]


def _chat_messages(prompt_template: str, payload: dict[str, object]) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": prompt_template,
        },
        {
            "role": "user",
            "content": json.dumps(payload, ensure_ascii=False, indent=2),
        },
    ]


def _resolved_aspect_ratio(payload: dict[str, object]) -> str:
    aspect_ratio = str(payload.get("aspect_ratio") or "3:4")
    template = payload.get("template")
    if isinstance(template, dict):
        aspect_ratio = str(template.get("aspect_ratio") or aspect_ratio)
    return aspect_ratio


def _extract_chat_content(provider: str, data: dict[str, object]) -> str:
    try:
        choices = data["choices"]
        if not isinstance(choices, list):
            raise TypeError
        message = choices[0]["message"]
        content = message["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "没有返回正文内容"),
        ) from exc

    if isinstance(content, list):
        content = "\n".join(
            str(part.get("text", ""))
            for part in content
            if isinstance(part, dict) and part.get("text")
        )

    if not isinstance(content, str) or not content.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "返回内容为空"),
        )
    return content.strip()


def _post_chat_completion(
    provider: str,
    base_url: str,
    api_key: str,
    timeout_seconds: float,
    payload: dict[str, object],
) -> dict[str, object]:
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_redacted_provider_error_from_response(provider, exc.response),
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=_redacted_provider_timeout(provider, timeout_seconds),
        ) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_redacted_provider_error(provider),
        ) from exc

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "没有返回有效 JSON 对象"),
        )
    return data


def _post_image_generation(
    provider: str,
    base_url: str,
    api_key: str,
    timeout_seconds: float,
    payload: dict[str, object],
) -> dict[str, object]:
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(
                f"{base_url.rstrip('/')}/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_redacted_provider_error_from_response(provider, exc.response),
        ) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_redacted_provider_error(provider),
        ) from exc

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "没有返回有效 JSON 对象"),
        )
    return data


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _public_tone(value: object) -> str:
    tone = str(value or "自然、可信、克制")
    return tone.split("隐藏撰稿规则：", 1)[0].rstrip("；; ") or "自然、可信、克制"


def _missing_required_web_sources(value: object) -> bool:
    if not isinstance(value, dict) or value.get("required") is not True:
        return False
    raw_results = value.get("results")
    return not isinstance(raw_results, list) or not raw_results


def _test_draft(payload: dict[str, object]) -> str:
    topic = str(payload.get("topic") or "未命名选题")
    platform = str(payload.get("platform") or "unknown")
    tone = _public_tone(payload.get("tone"))
    audience = str(payload.get("target_audience") or "硕升博申请人")
    tags = _string_list(payload.get("tags"))
    knowledge_context = payload.get("knowledge_context")
    context_items = knowledge_context if isinstance(knowledge_context, list) else []
    context_titles = [
        str(item.get("title"))
        for item in context_items
        if isinstance(item, dict) and item.get("title")
    ][:3]
    web_search_context = payload.get("web_search_context")
    web_search_titles: list[str] = []
    if isinstance(web_search_context, dict):
        raw_results = web_search_context.get("results")
        if isinstance(raw_results, list):
            web_search_titles = [
                str(item.get("title"))
                for item in raw_results
                if isinstance(item, dict) and item.get("title")
            ][:3]
    source_titles = [*context_titles, *web_search_titles]
    source_line = "、".join(source_titles) if source_titles else "暂无知识库引用"
    tag_line = " ".join(f"#{tag}" for tag in tags) if tags else "#硕升博 #博士申请"
    is_xiaohongshu = platform == "xiaohongshu"
    is_water_ranking = is_water_ranking_topic(topic, tags)
    topic_intent = first_matching_topic_intent(topic, tags)
    missing_required_web_sources = _missing_required_web_sources(web_search_context)
    if is_xiaohongshu and is_water_ranking:
        body_lines = [
            f"👉💧姐妹们，想看“{topic}”，先别急着找一张“万能榜单”哈！！[哇R]",
            "水博/海外博士这种内容，真正有用的不是谁把学校名字排得最满，而是把认证、预算、毕业难度和适配人群拆清楚。",
            (
                "👇当前没有可见 Tavily 来源时，就先做“榜单维度”和核验框架，不要硬编学校名（这个会很亏）……"
                if missing_required_web_sources
                else "👇如果没有已核实的学校数据，就先做“榜单维度”，不要硬编学校名（这个会很亏）……"
            ),
            "",
            "📍1. 先看认证稳不稳：能不能留服认证、项目类型是什么、毕业证学位证怎么落地。",
            "📍2. 再看预算压力：学费、差旅、住宿、请假成本要放在同一张表里比。",
            "📍3. 继续看毕业难度：论文、答辩、出勤、语言要求，别只看入学门槛。",
            "📍4. 最后看适合谁：在职、转专业、急需学历背书的人，判断标准完全不一样。",
            "",
            f"🔥所以“{topic}”更适合写成：认证优先榜、预算友好榜、毕业压力榜、在职友好榜。",
            "🎓等知识库补齐真实学校/项目后，再把具体学校放进榜单；没核实前只给筛选框架，不假装有内部排名。",
            "💓宝子，榜单不是为了制造焦虑，是帮你少踩坑呀～",
        ]
    elif is_xiaohongshu and missing_required_web_sources:
        body_lines = [
            f"👉💧姐妹们，“{topic}”这个选题不能靠印象写哈！！[哇R]",
            "它涉及学校/项目、价格、logo/校徽、排名或政策这类实时信息；没有可见 Tavily 来源时，先做核验框架，不要硬编具体名字。",
            "👇可以先这样拆：",
            "",
            "📍1. 官方来源：先找学校官网、项目页、认证说明和公开费用页。不能只看搬运帖。",
            "📍2. 信息字段：把学校/项目名、价格、logo/校徽、认证、出勤和毕业要求分列核对。",
            "📍3. 风险标记：来源缺失、年份不明、费用口径不一致的内容，先标成待复核。",
            "📍4. 输出方式：没有来源前只讲核验步骤和对比维度，不写具体排行榜或价格结论。",
            "",
            "🔥所以这篇更适合先做“来源复核清单”，等 Tavily 或知识库补齐后再填学校、价格和排名。",
            "💓宁愿慢一点，也别把没核实的信息写得像官方结论呀～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "source_check":
        body_lines = [
            f"👉💧姐妹们，“{topic}”这种选题先别急着下结论！！[哇R]",
            "它不是普通经验帖，而是来源核验帖：官网、项目页、费用页、校徽/logo 和认证信息都要能回到原始出处。",
            "👇可以按这 4 步写：",
            "",
            "📍1. 官方来源：优先看学校官网、项目页、费用页和认证说明，不把搬运帖当依据。",
            "📍2. 字段核对：学校/项目名、价格、logo/校徽、学费口径、年份和出勤要求分开记录。",
            "📍3. 风险标注：来源缺失、页面年份不明、费用口径不同的内容，先写成待复核。",
            "📍4. 发布边界：没有 URL/snippet 支撑时，只写核验方法，不写确定学校名单或价格结论。",
            "",
            "🔥这类内容的重点不是显得信息多，而是让读者知道每个结论从哪里来。",
            "💓来源清楚，后面做榜单和咨询才更稳呀～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "list_filter":
        body_lines = [
            f"👉💧姐妹们，“{topic}”别写成一堆学校名堆叠哈！！[哇R]",
            "榜单/筛选类内容最重要的是维度清楚：先讲怎么筛，再讲哪些信息需要核验，不能把没确认的项目包装成排名结论。",
            "👇可以按这 4 层拆：",
            "",
            "📍1. 认证优先：先看学位类型、认证路径、官网信息和项目合规边界。",
            "📍2. 预算分层：学费、差旅、住宿、请假和时间成本要放在同一张表里比。",
            "📍3. 风险排查：毕业要求、论文压力、出勤模式、付款节点都要单独标注。",
            "📍4. 适配人群：在职、转专业、低预算、急需学历背书的人，筛选标准不同。",
            "",
            "🔥所以这类选题适合写成筛选清单、风险分层或预算友好榜，而不是凭感觉排学校。",
            "💓先把筛选逻辑讲清楚，再补真实项目，读者会更容易信你呀～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "route":
        body_lines = [
            "👉💧姐妹们，硕升博路线真的不是看谁名字更响就选谁呀！！[哇R]",
            "路线选择要先看适配，不是先看热闹。国内、海外、在职、项目型博士，每条路的时间、预算和毕业要求都不一样。",
            "👇可以按这 4 个判断顺序来拆：",
            "",
            "📍1. 先看目标：评职称、转方向、做科研，还是补学历背书。",
            "📍2. 再看约束：能不能脱产、预算上限、语言基础、出勤安排。",
            "📍3. 继续看风险：认证、毕业要求、论文压力、导师匹配难度。",
            "📍4. 最后看行动：先筛路线，再筛学校/项目，最后准备材料。",
            "",
            "🔥路线不是越多越好，而是越能匹配你现在的工作和未来目标越稳。",
            "💓先把选择标准定下来，再去看项目，会少很多反复纠结哦～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "background":
        body_lines = [
            "👉💧没有论文也想读博，先别直接判自己没机会呀！！[哭惹R]",
            "能不能读博，不是只看有没有论文，而是看你的项目经历、工作成果和研究计划能不能证明研究潜力。",
            "👇可以先做这 4 个补强动作：",
            "",
            "📍1. 先盘项目经历：你做过什么问题、用了什么方法、产出了什么结果。",
            "📍2. 再整理工作成果：报告、专利、课题、行业案例，都可以变成研究证据。",
            "📍3. 继续补研究计划：把选题、问题意识、方法和可行材料讲清楚。",
            "📍4. 最后判断短板：论文、英语、推荐人、方向匹配，哪些能补，哪些要换路线。",
            "",
            "🔥没论文不是终点，真正要补的是“我为什么有能力做研究”的证据链。",
            "💓先把背景补强清单列出来，再决定冲哪些项目会稳很多～",
        ]
    elif (
        is_xiaohongshu
        and topic_intent
        and topic_intent.key == "mentor"
        and any(term in topic for term in ("研究方向", "方向太散"))
    ):
        body_lines = [
            "👉💧研究方向太散，真的不是再多找几个导师就能解决呀！！[笑哭R]",
            "方向收敛的关键，是把兴趣变成一个导师能看懂的问题，而不是把所有想法都塞进申请里。",
            "👇可以按这 4 步收：",
            "",
            "📍1. 先做关键词聚类：领域、对象、方法各保留 2-3 个高频词。",
            "📍2. 再找问题意识：你到底想解决什么矛盾，别只写宽泛兴趣。",
            "📍3. 继续看方法匹配：定量、访谈、案例、实验，哪种和经历最贴。",
            "📍4. 最后用经历证据收口：课程、项目、工作案例要能支撑这个方向。",
            "",
            "🔥方向不是越大越高级，而是越聚焦越容易被导师接住。",
            "💓先把一个方向讲清楚，再谈导师匹配会更有说服力哦～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "mentor":
        body_lines = [
            "👉💧姐妹们，导师匹配前真的别先群发邮件呀！！[哭惹R]",
            "导师匹配不是看谁 title 大，而是看你的研究方向能不能被老师接住。",
            "👇建议先做这 4 步：",
            "",
            "📍1. 先列自己的研究关键词：领域、对象、方法各写 2-3 个。",
            "📍2. 再看导师近三年论文/项目，找真实交集，不只看学院介绍。",
            "📍3. 继续判断你能贡献什么：数据、经历、方法、行业案例都算。",
            "📍4. 最后再写套磁邮件，把匹配证据讲清楚。",
            "",
            "🔥导师不是被模板打动的，是被“你为什么适合这个方向”打动的。",
            "💓先把匹配证据准备好，再联系导师会稳很多呀～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "timeline":
        body_lines = [
            "👉💧在职博士申请时间线，真的不是等简章出来才开始哦！！[笑哭R]",
            "时间安排要倒推：你不是只要赶报名，而是要提前把方向、材料、推荐和项目筛选都排好。",
            "👇可以按这几个阶段拆：",
            "",
            "📍12-9 个月：确定路线和目标，先筛掉不适合的项目。",
            "📍9-6 个月：整理 CV、成果、研究计划初稿和推荐人名单。",
            "📍6-3 个月：精修材料，对照项目要求补证明和语言/论文材料。",
            "📍最后 1 个月：核对系统、文件命名、推荐流程和面试表达。",
            "",
            "🔥时间线不是制造焦虑，是帮你把任务拆小，避免最后一周爆炸。",
            "💓宝子，越早拆阶段，越不容易被 DDL 追着跑～",
        ]
    elif (
        is_xiaohongshu
        and topic_intent
        and topic_intent.key == "sales"
        and any(term in topic for term in ("含金量", "怎么回答"))
    ):
        body_lines = [
            "👉💧别人问博士含金量，别急着一句“当然有用”顶回去呀！！[哇R]",
            "更稳的回答，是把价值讲成可验证的判断框架，而不是承诺薪资、身份或一定被认可。",
            "👇可以这样拆：",
            "",
            "📍1. 先看职业目标：评职称、晋升、转岗、做研究，目标不同含金量不同。",
            "📍2. 再看单位认可：是否需要认证、学位类型、学习方式和材料证明。",
            "📍3. 继续看现实成本：时间、预算、出勤、论文压力都要算进去。",
            "📍4. 最后讲学习价值：研究训练、行业表达、长期身份，而不是短期包装。",
            "",
            "🔥回答含金量，本质是在处理异议：别夸大，也别把所有项目说成一样。",
            "💓把价值和边界讲清楚，反而更容易让对方信任你呀～",
        ]
    elif is_xiaohongshu and topic_intent and topic_intent.key == "sales":
        body_lines = [
            "👉💧上班族咨询博士项目，第一句真的别只问“有没有名额”呀！！[哇R]",
            "更稳的咨询转化，是先判断需求和适配，再给项目建议，不要一上来就推方案。",
            "👇可以按这 5 步沟通：",
            "",
            "📍1. 先问目标：评职称、晋升、转型，还是长期学术发展。",
            "📍2. 再问约束：预算、时间、语言、出勤、单位认可要求。",
            "📍3. 继续判断项目适配：认证、毕业难度、方向匹配、服务边界。",
            "📍4. 给出下一步：材料清单、路线建议、风险点，而不是承诺结果。",
            "📍5. 跟进节奏要克制：把问题解决清楚，比催单更重要。",
            "",
            "🔥合规转化的核心不是夸大效果，而是让用户知道自己适不适合。",
            "💓把需求问透，后面推荐项目才不会跑偏呀～",
        ]
    elif is_xiaohongshu:
        body_lines = [
            "👉姐妹们，硕升博真的不是先套磁！！[哇R]",
            "很多同学一上来就想群发邮件，但最容易卡住的，反而是顺序一乱就开始内耗（真的会累）……",
            "👇建议先把研究方向、目标导师和时间节点拆开看：方向决定你要讲清楚什么，导师决定你要证明什么，时间节点决定你现在该做什么～",
            "",
            "📍可以先做三件事：",
            "✅1. 用一页纸写清楚自己的研究兴趣和已有积累。",
            "✅2. 对照目标项目，整理课程、论文、经历和推荐人材料。",
            "✅3. 联系导师前先读近期成果，避免只发模板化自我介绍（这个真的会被看出来）。",
            "",
            "🔥这一步不是拖延，而是在帮你后面少走弯路。",
            "🎓如果涉及项目/方向选择，就把专业、导师、毕业要求放在一张表里先筛一遍。",
            "😎宝子，如果现在还没想清楚方向，先别逼自己立刻发邮件～[赞R]",
            "💓先把底层逻辑捋顺，再去套磁会稳很多。",
        ]
    elif is_water_ranking:
        body_lines = [
            "水博排名类内容应先确认认证、预算、毕业难度和适配人群，不能在缺少核实资料时编学校名。",
            "可以先做四类榜单维度：认证优先、预算友好、毕业压力、在职友好。",
            "",
            "等知识库补齐真实学校或项目信息后，再输出具体学校/项目排序。",
        ]
    else:
        body_lines = [
            "很多同学准备硕升博时，最容易卡住的不是某一份材料，而是不知道先后顺序。",
            "建议先把研究方向、目标导师和时间节点拆开看：方向决定你要讲清楚什么，导师决定你要证明什么，时间节点决定你现在该做什么。",
            "",
            "可以先做三件事：",
            "1. 用一页纸写清楚自己的研究兴趣和已有积累。",
            "2. 对照目标项目，整理课程、论文、经历和推荐人材料。",
            "3. 联系导师前先读近期成果，避免只发模板化自我介绍。",
        ]

    return "\n".join(
        [
            f"【本地检查草稿】{topic}",
            "",
            f"面向：{audience}",
            f"平台：{platform}",
            f"语气：{tone}",
            "",
            *body_lines,
            f"参考上下文：{source_line}",
            f"标签：{tag_line}",
            "",
            "风险提示：这是本地检查模式生成的草稿，只用于流程验证，正式发布前必须经过人工审核。",
        ]
    )


def _aspect_ratio_size(aspect_ratio: str) -> tuple[int, int]:
    return IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO.get(
        aspect_ratio,
        IMAGE_PIXEL_SIZE_BY_ASPECT_RATIO["3:4"],
    )


def _ratio_value(value: str) -> float | None:
    parts = value.lower().replace("x", ":").split(":")
    if len(parts) != 2:
        return None
    try:
        width = float(parts[0])
        height = float(parts[1])
    except ValueError:
        return None
    if width <= 0 or height <= 0:
        return None
    return width / height


def _matching_configured_image_size(aspect_ratio: str) -> str | None:
    configured_size = (settings.image_size or "").strip()
    if not configured_size:
        return None

    target_ratio = _ratio_value(aspect_ratio)
    configured_ratio = _ratio_value(configured_size)
    if target_ratio is None or configured_ratio is None:
        return configured_size
    if abs(configured_ratio - target_ratio) / target_ratio <= 0.03:
        return configured_size
    return None


def _wrap_svg_text(text: str, width: int = 12, max_lines: int = 4) -> list[str]:
    lines = textwrap.wrap(text, width=width)[:max_lines]
    return lines or ["OPC 本地检查封面"]


def _test_image(payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "OPC 本地检查封面")
    platform = str(payload.get("platform") or "multi")
    aspect_ratio = _resolved_aspect_ratio(payload)
    template = payload.get("template")
    template_name = "本地检查封面模板"
    if isinstance(template, dict):
        template_name = str(template.get("name") or template_name)

    width, height = _aspect_ratio_size(aspect_ratio)
    digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:12]
    slug = FILENAME_RE.sub("-", title.lower()).strip("-")[:36] or "opc-test-cover"
    filename = f"codex-test-{slug}-{digest}.svg"
    GENERATED_ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    target = GENERATED_ASSET_ROOT / filename

    title_lines = _wrap_svg_text(title)
    title_spans = "\n".join(
        f'<text x="72" y="{260 + index * 78}" class="title">{html.escape(line)}</text>'
        for index, line in enumerate(title_lines)
    )
    tag_line = html.escape(f"{platform} · {template_name} · 本地检查模式")
    body_line = html.escape("仅用于流程测试，正式发布前需要人工审核")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f7f2"/>
      <stop offset="55%" stop-color="#dfe8dd"/>
      <stop offset="100%" stop-color="#f1c8bb"/>
    </linearGradient>
    <style>
      .label {{ font: 700 30px Arial, sans-serif; fill: #456179; }}
      .title {{ font: 800 62px Arial, sans-serif; fill: #182033; }}
      .body {{ font: 500 30px Arial, sans-serif; fill: #4b5563; }}
      .mark {{ font: 700 24px Arial, sans-serif; fill: #ffffff; }}
    </style>
  </defs>
  <rect width="{width}" height="{height}" fill="url(#bg)"/>
  <rect x="44" y="44" width="{width - 88}" height="{height - 88}" rx="28" fill="#ffffff" opacity="0.72"/>
  <text x="72" y="128" class="label">{tag_line}</text>
  {title_spans}
  <text x="72" y="{height - 178}" class="body">{body_line}</text>
  <rect x="72" y="{height - 124}" width="236" height="52" rx="10" fill="#182033"/>
  <text x="96" y="{height - 89}" class="mark">本地检查素材</text>
</svg>
"""
    target.write_text(svg, encoding="utf-8")
    return f"{settings.test_static_url_prefix.rstrip('/')}/{filename}"


def _image_size(aspect_ratio: str) -> str:
    configured_size = _matching_configured_image_size(aspect_ratio)
    if configured_size:
        return configured_size
    return IMAGE_PROVIDER_SIZE_BY_ASPECT_RATIO.get(
        aspect_ratio,
        DEFAULT_XIAOHONGSHU_IMAGE_SIZE,
    )


def _image_prompt(prompt_template: str, payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "OPC cover")
    platform = str(payload.get("platform") or "multi")
    content_status = str(payload.get("content_status") or "draft")
    body = str(payload.get("body") or "")
    tags = " ".join(f"#{tag}" for tag in _string_list(payload.get("tags")))
    style_notes = str(payload.get("style_notes") or "clean, readable, platform-ready")
    aspect_ratio = _resolved_aspect_ratio(payload)
    template = payload.get("template")
    template_name = "cover"
    if isinstance(template, dict):
        template_name = str(template.get("name") or template_name)
    visual_direction = payload.get("visual_direction")
    visual_direction_lines: list[str] = []
    if isinstance(visual_direction, dict):
        visual_direction_lines = [
            "",
            "Selected visual direction:",
            f"ID: {visual_direction.get('id') or 'unspecified'}",
            f"Name: {visual_direction.get('name') or 'unspecified'}",
            f"Instructions: {visual_direction.get('instructions') or 'Follow the selected direction.'}",
            f"Avoid: {visual_direction.get('avoid') or 'Avoid repetitive template styling.'}",
        ]
    body_excerpt = body[:500]
    lines = [
        prompt_template.strip(),
        "",
        "Payload:",
        f"Platform: {platform}.",
        f"Template: {template_name}.",
        f"Aspect ratio: {aspect_ratio}.",
        f"Content status: {content_status}.",
        f"Primary cover headline, copied verbatim: {title}",
        f"Tags: {tags}",
        f"Style notes: {style_notes}",
        f"Content context: {body_excerpt}",
    ]
    lines.extend(visual_direction_lines)
    style_reference = str(payload.get("style_reference") or "").strip()
    if style_reference:
        lines.extend(["", "Platform style reference:", style_reference[:2400]])
    return "\n".join(lines)


def _extract_image_url(provider: str, data: dict[str, object], payload: dict[str, object]) -> str:
    items = data.get("data")
    if not isinstance(items, list) or not items:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "没有返回图片数据"),
        )
    first = items[0]
    if not isinstance(first, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_provider_response_shape_error(provider, "图片数据结构无效"),
        )

    url = first.get("url")
    if isinstance(url, str) and url.strip():
        return url.strip()

    b64_json = first.get("b64_json")
    if isinstance(b64_json, str) and b64_json.strip():
        title = str(payload.get("title") or "opc-image")
        digest = hashlib.sha256(b64_json.encode("utf-8")).hexdigest()[:12]
        slug = FILENAME_RE.sub("-", title.lower()).strip("-")[:36] or "opc-image"
        filename = f"image2-{slug}-{digest}.png"
        GENERATED_ASSET_ROOT.mkdir(parents=True, exist_ok=True)
        target = GENERATED_ASSET_ROOT / filename
        try:
            target.write_bytes(b64decode(b64_json))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_provider_response_shape_error(provider, "图片数据解码失败"),
            ) from exc
        return f"{settings.test_static_url_prefix.rstrip('/')}/{filename}"

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=_provider_response_shape_error(provider, "没有返回可用图片链接或图片数据"),
    )


class ModelRouter:
    def embedding_model(self, text: str) -> list[float]:
        tokens = TOKEN_RE.findall(text.lower())
        dimensions = settings.embedding_dimensions
        vector = [0.0] * dimensions
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]

    def draft_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if settings.draft_provider == "codex_test":
            return _test_draft(payload)
        if settings.draft_provider == "openai_compatible":
            if not settings.openai_compatible_api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="撰稿服务尚未配置服务授权。",
                )
            request_payload: dict[str, object] = {
                "model": settings.draft_model,
                "messages": _chat_messages(prompt_template, payload),
                "stream": False,
                "store": False,
                "temperature": settings.draft_temperature,
                "max_tokens": settings.draft_max_tokens,
            }
            data = _post_chat_completion(
                provider="OpenAI-compatible draft provider",
                base_url=settings.openai_compatible_base_url,
                api_key=settings.openai_compatible_api_key,
                timeout_seconds=settings.draft_timeout_seconds,
                payload=request_payload,
            )
            return _extract_chat_content("OpenAI-compatible draft provider", data)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="撰稿服务尚未配置。",
        )

    def rewrite_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if not settings.deepseek_api_key:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="改写服务尚未配置。",
            )

        request_payload: dict[str, object] = {
            "model": settings.deepseek_rewrite_model,
            "messages": _deepseek_messages(prompt_template, payload),
            "thinking": {"type": "disabled"},
            "temperature": 0.7,
            "stream": False,
        }
        data = _post_chat_completion(
            provider="DeepSeek",
            base_url=settings.deepseek_base_url,
            api_key=settings.deepseek_api_key,
            timeout_seconds=settings.deepseek_timeout_seconds,
            payload=request_payload,
        )
        return _extract_chat_content("DeepSeek", data)

    def image_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if settings.image_provider == "codex_test":
            return _test_image(payload)
        if settings.image_provider == "openai_compatible":
            api_key = settings.image_openai_compatible_api_key or settings.openai_compatible_api_key
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="图片服务尚未配置服务授权。",
                )
            base_url = (
                settings.image_openai_compatible_base_url
                or settings.openai_compatible_base_url
            )
            request_payload: dict[str, object] = {
                "model": settings.image_model,
                "prompt": _image_prompt(prompt_template, payload),
                "n": 1,
            }
            request_payload["size"] = _image_size(_resolved_aspect_ratio(payload))
            if settings.image_response_format:
                request_payload["response_format"] = settings.image_response_format
            data = _post_image_generation(
                provider="OpenAI-compatible image provider",
                base_url=base_url,
                api_key=api_key,
                timeout_seconds=settings.image_timeout_seconds,
                payload=request_payload,
            )
            return _extract_image_url(
                "OpenAI-compatible image provider",
                data,
                payload,
            )
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="图片服务尚未配置。",
        )

    def review_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        load_prompt(prompt_name)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="确认服务尚未配置。",
        )


model_router = ModelRouter()
