import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOPIC_PRESETS_FILE = PROJECT_ROOT / "frontend" / "lib" / "topic-presets.ts"
REQUIRED_TOPIC_PRESET_FIELDS = {
    "audience",
    "coverDirection",
    "desktopHelper",
    "desktopLabel",
    "key",
    "knowledgeQuery",
    "mobileHelper",
    "mobileLabel",
    "tags",
    "topic",
}


def split_topic_tags(tags: str) -> list[str]:
    return [tag.strip() for tag in re.split(r"[,，、;；]+", tags) if tag.strip()]


def load_generation_topic_presets() -> list[dict[str, str]]:
    preset_text = TOPIC_PRESETS_FILE.read_text(encoding="utf-8")
    array_match = re.search(
        r"export const generationTopicPresets[^=]*=\s*\[(.*?)\];",
        preset_text,
        re.S,
    )
    assert array_match is not None, "Could not find generationTopicPresets export"
    preset_objects = re.findall(
        r'\{\s*(audience:.*?topic:\s*"[^"]+"\s*)\}',
        array_match.group(1),
        re.S,
    )
    presets = [
        dict(re.findall(r'(\w+):\s*"([^"]*)"', raw_preset))
        for raw_preset in preset_objects
    ]
    for index, preset in enumerate(presets):
        missing = sorted(field for field in REQUIRED_TOPIC_PRESET_FIELDS if not preset.get(field))
        assert not missing, f"Topic preset #{index + 1} missing fields: {', '.join(missing)}"
    keys = [preset["key"] for preset in presets]
    topics = [preset["topic"] for preset in presets]
    assert len(keys) == len(set(keys)), "Topic preset keys must be unique"
    assert len(topics) == len(set(topics)), "Topic preset topics must be unique"
    return presets
