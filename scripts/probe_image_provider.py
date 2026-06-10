from __future__ import annotations

from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = ROOT / ".env"
    if not env_path.exists():
        raise SystemExit(".env was not found.")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


def main() -> None:
    env = load_env()
    api_key = env.get("IMAGE_OPENAI_COMPATIBLE_API_KEY") or env.get(
        "OPENAI_COMPATIBLE_API_KEY"
    )
    if not api_key:
        raise SystemExit("Image provider key is not configured.")

    base_url = env.get("IMAGE_OPENAI_COMPATIBLE_BASE_URL") or env.get(
        "OPENAI_COMPATIBLE_BASE_URL",
        "https://api.openai.com/v1",
    )
    payload = {
        "model": env.get("IMAGE_MODEL", "gpt-image-2"),
        "prompt": "A clean square social media cover with Chinese title text: 硕升博申请节奏",
        "size": env.get("IMAGE_SIZE", "1024x1024"),
        "n": 1,
    }
    response_format = env.get("IMAGE_RESPONSE_FORMAT")
    if response_format:
        payload["response_format"] = response_format

    response = httpx.post(
        f"{base_url.rstrip('/')}/images/generations",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=float(env.get("IMAGE_TIMEOUT_SECONDS", "180")),
    )
    print(f"image_probe_status={response.status_code}")
    if response.status_code >= 400:
        print(f"image_probe_body={response.text[:1000]}")
        raise SystemExit(1)

    data = response.json()
    items = data.get("data", [])
    first = items[0] if items else {}
    print(f"image_probe_has_url={isinstance(first.get('url'), str)}")
    print(f"image_probe_has_b64={isinstance(first.get('b64_json'), str)}")


if __name__ == "__main__":
    main()
