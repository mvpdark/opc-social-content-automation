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


PROMPT_ROOT = Path(__file__).resolve().parents[3] / "prompts"
GENERATED_ASSET_ROOT = Path(__file__).resolve().parents[2] / "static" / "generated"
TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)
FILENAME_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def load_prompt(name: str) -> str:
    prompt_path = PROMPT_ROOT / f"{name}.md"
    if not prompt_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prompt template is missing: {name}",
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
        return f"{provider_label}授权失败，请检查设置里的 API Key 和中转站地址。"
    if status_code == 404:
        return f"{provider_label}服务或接口地址不可用，请检查设置里的服务配置和中转站地址。"
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
        return f"{provider_label} API Key 无效，请在设置页更换有效 Key 后重新检测。"

    return _redacted_provider_error(provider, status_code)


def _redacted_provider_timeout(provider: str, timeout_seconds: float) -> str:
    provider_label = _provider_display_label(provider)
    timeout_text = f"{timeout_seconds:g}"
    return (
        f"{provider_label}响应超时（超过 {timeout_text} 秒）。"
        "请稍后重试；如果反复出现，请降低输出长度或更换可用服务配置/中转站。"
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
            "content": "\n".join(
                [
                    prompt_template,
                    "",
                    "Compatibility note: the user payload is ASCII JSON with "
                    "Unicode escape sequences such as \\u7855. Decode those "
                    "sequences before writing. When the target platform is "
                    "Xiaohongshu, still return natural Simplified Chinese.",
                ]
            ),
        },
        {
            "role": "user",
            "content": json.dumps(payload, ensure_ascii=True, indent=2),
        },
    ]


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
            detail=f"{provider} response did not include message content.",
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
            detail=f"{provider} response content was empty.",
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
            detail=f"{provider} response was not a JSON object.",
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
            detail=f"{provider} response was not a JSON object.",
        )
    return data


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _public_tone(value: object) -> str:
    tone = str(value or "自然、可信、克制")
    return tone.split("隐藏撰稿规则：", 1)[0].rstrip("；; ") or "自然、可信、克制"


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
    source_line = "、".join(context_titles) if context_titles else "暂无知识库引用"
    tag_line = " ".join(f"#{tag}" for tag in tags) if tags else "#硕升博 #博士申请"
    is_xiaohongshu = platform == "xiaohongshu"
    body_lines = (
        [
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
        if is_xiaohongshu
        else [
            "很多同学准备硕升博时，最容易卡住的不是某一份材料，而是不知道先后顺序。",
            "建议先把研究方向、目标导师和时间节点拆开看：方向决定你要讲清楚什么，导师决定你要证明什么，时间节点决定你现在该做什么。",
            "",
            "可以先做三件事：",
            "1. 用一页纸写清楚自己的研究兴趣和已有积累。",
            "2. 对照目标项目，整理课程、论文、经历和推荐人材料。",
            "3. 联系导师前先读近期成果，避免只发模板化自我介绍。",
        ]
    )

    return "\n".join(
        [
            f"【演示草稿】{topic}",
            "",
            f"面向：{audience}",
            f"平台：{platform}",
            f"语气：{tone}",
            "",
            *body_lines,
            f"参考上下文：{source_line}",
            f"标签：{tag_line}",
            "",
            "风险提示：这是演示模式生成的草稿，只用于流程测试，正式发布前必须经过人工审核。",
        ]
    )


def _aspect_ratio_size(aspect_ratio: str) -> tuple[int, int]:
    mapping = {
        "1:1": (1080, 1080),
        "3:4": (900, 1200),
        "4:5": (1080, 1350),
        "9:16": (900, 1600),
    }
    return mapping.get(aspect_ratio, (900, 1200))


def _wrap_svg_text(text: str, width: int = 12, max_lines: int = 4) -> list[str]:
    lines = textwrap.wrap(text, width=width)[:max_lines]
    return lines or ["OPC 演示封面"]


def _test_image(payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "OPC 演示封面")
    platform = str(payload.get("platform") or "multi")
    aspect_ratio = str(payload.get("aspect_ratio") or "3:4")
    template = payload.get("template")
    template_name = "演示封面模板"
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
    tag_line = html.escape(f"{platform} · {template_name} · 演示模式")
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
  <text x="96" y="{height - 89}" class="mark">演示素材</text>
</svg>
"""
    target.write_text(svg, encoding="utf-8")
    return f"{settings.test_static_url_prefix.rstrip('/')}/{filename}"


def _image_size(aspect_ratio: str) -> str:
    mapping = {
        "1:1": "1024x1024",
        "3:4": "1024x1536",
        "4:5": "1024x1536",
        "9:16": "1024x1792",
    }
    return mapping.get(aspect_ratio, "1024x1536")


def _image_prompt(prompt_template: str, payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "OPC cover")
    platform = str(payload.get("platform") or "multi")
    content_status = str(payload.get("content_status") or "draft")
    body = str(payload.get("body") or "")
    tags = " ".join(f"#{tag}" for tag in _string_list(payload.get("tags")))
    style_notes = str(payload.get("style_notes") or "clean, readable, platform-ready")
    aspect_ratio = str(payload.get("aspect_ratio") or "3:4")
    template = payload.get("template")
    template_name = "cover"
    if isinstance(template, dict):
        template_name = str(template.get("name") or template_name)
        aspect_ratio = str(template.get("aspect_ratio") or aspect_ratio)
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
            detail=f"{provider} response did not include image data.",
        )
    first = items[0]
    if not isinstance(first, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{provider} response image data was invalid.",
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
                detail=f"{provider} response image payload was invalid.",
            ) from exc
        return f"{settings.test_static_url_prefix.rstrip('/')}/{filename}"

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"{provider} response did not include a supported image field.",
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
                    detail="OpenAI-compatible draft provider is not configured yet.",
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
            detail="Draft model provider is not configured yet.",
        )

    def rewrite_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        prompt_template = load_prompt(prompt_name)
        if not settings.deepseek_api_key:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="DeepSeek rewrite provider is not configured yet.",
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
                    detail="OpenAI-compatible image provider is not configured yet.",
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
            request_payload["size"] = _image_size(str(payload.get("aspect_ratio") or "3:4"))
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
            detail="Image model provider is not configured yet.",
        )

    def review_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        load_prompt(prompt_name)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Review model provider is not configured yet.",
        )


model_router = ModelRouter()
