import hashlib
import html
import json
import re
import textwrap
from base64 import b64decode
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.model_router_helpers import (
    _provider_response_shape_error,
    _resolved_aspect_ratio,
    _string_list,
)

GENERATED_ASSET_ROOT = Path(__file__).resolve().parents[2] / "static" / "generated"
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
