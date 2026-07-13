import json
import logging
import re
from pathlib import Path

import httpx
from fastapi import HTTPException, status

PROMPT_ROOT = Path(__file__).resolve().parents[3] / "prompts"

logger = logging.getLogger(__name__)


def load_prompt(name: str) -> str:
    # 路径遍历保护：仅允许字母、数字、下划线和连字符。
    if not re.match(r"^[a-zA-Z0-9_-]+$", name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的提示词名称：{name}",
        )
    prompt_path = PROMPT_ROOT / f"{name}.md"
    if not prompt_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"缺少提示词模板：{name}",
        )
    try:
        return prompt_path.read_text(encoding="utf-8")
    except OSError:
        logger.exception("无法读取 prompt 文件: %s", name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"无法读取 prompt 文件: {name}",
        )


def load_platform_style_reference(platform: object) -> str:
    normalized_platform = str(platform or "").strip().lower()
    if normalized_platform == "xiaohongshu":
        return load_prompt("xiaohongshu_style_reference")
    return ""


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _redacted_provider_error(provider: str, status_code: int | None = None) -> str:
    provider_label = {
        "OpenAI-compatible draft provider": "撰稿服务",
        "OpenAI-compatible image provider": "图片服务",
        "OpenAI-compatible rewrite provider": "改写服务",
        "DeepSeek": "改写服务",
        "OpenAI-compatible review provider": "审核服务",
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
        "OpenAI-compatible rewrite provider": "改写服务",
        "DeepSeek": "改写服务",
        "OpenAI-compatible review provider": "审核服务",
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



def _normalize_base_url(base_url: str) -> str:
    """Ensure base_url ends with /v1 for OpenAI-compatible APIs."""
    url = base_url.rstrip('/')
    if not url.endswith('/v1'):
        url = f"{url}/v1"
    return url


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
                f"{_normalize_base_url(base_url)}/chat/completions",
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
                f"{_normalize_base_url(base_url)}/images/generations",
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
