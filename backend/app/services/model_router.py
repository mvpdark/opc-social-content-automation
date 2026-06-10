from pathlib import Path
import hashlib
import json
import math
import re

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


PROMPT_ROOT = Path(__file__).resolve().parents[3] / "prompts"
TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


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
        load_prompt(prompt_name)
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
        try:
            with httpx.Client(timeout=settings.deepseek_timeout_seconds) as client:
                response = client.post(
                    f"{settings.deepseek_base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.deepseek_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_redacted_provider_error("DeepSeek", exc.response.status_code),
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_redacted_provider_error("DeepSeek"),
            ) from exc

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="DeepSeek response did not include message content.",
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="DeepSeek response content was empty.",
            )
        return content.strip()

    def image_model(self, prompt_name: str, payload: dict[str, object]) -> str:
        load_prompt(prompt_name)
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
