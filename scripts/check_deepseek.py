from __future__ import annotations

from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env_path = ROOT / ".env"
    values: dict[str, str] = {}
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
    api_key = env.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise SystemExit("DEEPSEEK_API_KEY is not configured.")

    base_url = env.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    response = httpx.get(
        f"{base_url}/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30,
    )
    print(f"deepseek_models_status={response.status_code}")
    response.raise_for_status()

    data = response.json()
    model_ids = [
        item.get("id")
        for item in data.get("data", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ]
    print(f"deepseek_model_count={len(model_ids)}")
    print(f"has_deepseek_v4_flash={'deepseek-v4-flash' in model_ids}")
    print(f"has_deepseek_v4_pro={'deepseek-v4-pro' in model_ids}")


if __name__ == "__main__":
    main()
