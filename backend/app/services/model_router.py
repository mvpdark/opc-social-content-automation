from pathlib import Path
import hashlib
import html
import json
import math
import re
import textwrap

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


def _redacted_provider_error(provider: str, status_code: int | None = None) -> str:
    suffix = f" HTTP {status_code}" if status_code is not None else ""
    return f"{provider} request failed{suffix}. Check provider configuration and logs."


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
            detail=_redacted_provider_error(provider, exc.response.status_code),
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


def _test_draft(payload: dict[str, object]) -> str:
    topic = str(payload.get("topic") or "未命名选题")
    platform = str(payload.get("platform") or "unknown")
    tone = str(payload.get("tone") or "自然、可信、克制")
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

    return "\n".join(
        [
            f"【测试草稿】{topic}",
            "",
            f"面向：{audience}",
            f"平台：{platform}",
            f"语气：{tone}",
            "",
            "很多同学准备硕升博时，最容易卡住的不是某一份材料，而是不知道先后顺序。",
            "建议先把研究方向、目标导师和时间节点拆开看：方向决定你要讲清楚什么，导师决定你要证明什么，时间节点决定你现在该做什么。",
            "",
            "可以先做三件事：",
            "1. 用一页纸写清楚自己的研究兴趣和已有积累。",
            "2. 对照目标项目，整理课程、论文、经历和推荐人材料。",
            "3. 联系导师前先读近期成果，避免只发模板化自我介绍。",
            "",
            f"参考上下文：{source_line}",
            f"标签：{tag_line}",
            "",
            "风险提示：这是 codex_test 测试 Provider 生成的草稿，只用于流程联调，正式发布前必须经过人工审核。",
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
    return lines or ["OPC Test Cover"]


def _test_image(payload: dict[str, object]) -> str:
    title = str(payload.get("title") or "OPC Test Cover")
    platform = str(payload.get("platform") or "multi")
    aspect_ratio = str(payload.get("aspect_ratio") or "3:4")
    template = payload.get("template")
    template_name = "Codex test template"
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
    tag_line = html.escape(f"{platform} · {template_name} · TEST")
    body_line = html.escape("仅用于流程联调，正式发布前需要人工审核")

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
  <text x="96" y="{height - 89}" class="mark">OPC TEST ASSET</text>
</svg>
"""
    target.write_text(svg, encoding="utf-8")
    return f"{settings.test_static_url_prefix.rstrip('/')}/{filename}"


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
        load_prompt(prompt_name)
        if settings.image_provider == "codex_test":
            return _test_image(payload)
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
