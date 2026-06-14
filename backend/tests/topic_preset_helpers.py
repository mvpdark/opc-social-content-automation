import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOPIC_PRESETS_FILE = PROJECT_ROOT / "frontend" / "lib" / "topic-presets.ts"


def split_topic_tags(tags: str) -> list[str]:
    return [tag.strip() for tag in re.split(r"[,，、;；]+", tags) if tag.strip()]


def load_generation_topic_presets() -> list[dict[str, str]]:
    preset_text = TOPIC_PRESETS_FILE.read_text(encoding="utf-8")
    preset_objects = re.findall(
        r'\{\s*(audience:.*?topic:\s*"[^"]+"\s*)\}',
        preset_text,
        re.S,
    )
    return [dict(re.findall(r'(\w+):\s*"([^"]*)"', raw_preset)) for raw_preset in preset_objects]
