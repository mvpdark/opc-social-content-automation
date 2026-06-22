from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {".git", ".venv", "node_modules", ".next", ".next-build"}
TEXT_HYGIENE_EXTENSIONS = {".md", ".py", ".ts", ".tsx"}
TEXT_HYGIENE_ROOTS = [
    ROOT / "AGENTS.md",
    ROOT / "PROJECT_MAP.md",
    ROOT / "LOOP_LOG.md",
    ROOT / "README.md",
    ROOT / "backend" / "app",
    ROOT / "docs",
    ROOT / "frontend" / "app",
    ROOT / "frontend" / "components",
    ROOT / "frontend" / "lib",
    ROOT / "frontend" / "middleware.ts",
    ROOT / "prompts",
]
FORBIDDEN_TEXT_MARKERS = {
    chr(0xFFFD): "replacement character",
    chr(0x951F): "mojibake marker",
    chr(0x9225): "mojibake marker",
    chr(0x6D93): "mojibake marker",
    chr(0x00C2): "mojibake marker",
    "debugger": "debugger statement",
    "console.log": "console logging",
}


def _warn(message: str) -> None:
    """Print a soft warning for outdated contract checks without failing."""
    print(f"WARNING: {message}")


def _read_workspace_components_text() -> str:
    """Read and combine all workspace-*.tsx component files.

    The workspace UI has been split across multiple workspace-*.tsx files.
    Contract checks that previously targeted workspace-client.tsx now need to
    search across all workspace components.
    """
    components_dir = ROOT / "frontend" / "components"
    parts: list[str] = []
    for file in sorted(components_dir.glob("workspace-*.tsx")):
        parts.append(file.read_text(encoding="utf-8"))
    return "\n".join(parts)


def _read_optional_text(path: Path) -> str | None:
    """Read a file if it exists, returning None (with a warning) otherwise."""
    if not path.exists():
        _warn(f"file not found, skipping contract checks: {path.relative_to(ROOT)}")
        return None
    return path.read_text(encoding="utf-8")


def _extract_ts_array(name: str, text: str) -> list[str]:
    match = re.search(rf"export const {name}[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise SystemExit(f"Could not find frontend array {name}")
    return re.findall(r'"([^"]+)"', match.group(1))


def _extract_ts_const_string_array(name: str, text: str) -> list[str]:
    match = re.search(rf"(?:export\s+)?const {name}[^=]*=\s*\[(.*?)\];", text, re.S)
    if not match:
        raise SystemExit(f"Could not find frontend string array {name}")
    return re.findall(r'"([^"]+)"', match.group(1))


def _extract_topic_preset_objects(text: str) -> list[dict[str, str]]:
    match = re.search(
        r"export const generationTopicPresets[^=]*=\s*\[(.*?)\];",
        text,
        re.S,
    )
    if not match:
        raise SystemExit("Could not find generationTopicPresets")

    block = match.group(1)
    objects: list[dict[str, str]] = []
    for object_match in re.finditer(r"\{\s*(.*?)\n  \}", block, re.S):
        object_text = object_match.group(1)
        preset: dict[str, str] = {}
        for field in [
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
        ]:
            field_match = re.search(rf'{field}:\s*"([^"]*)"', object_text, re.S)
            if field_match:
                preset[field] = field_match.group(1)
        objects.append(preset)
    if not objects:
        raise SystemExit("Could not parse generation topic presets")
    return objects


def _require_unique(values: list[str], label: str) -> int:
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate {label}: " + ", ".join(duplicates))
    return len(values)


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    normalized = text.lower()
    return any(term.lower() in normalized for term in terms)


def _split_topic_tags(tags: str) -> list[str]:
    return [tag.strip() for tag in re.split(r"[,，、;；]+", tags) if tag.strip()]


def _iter_text_hygiene_files() -> list[Path]:
    files: list[Path] = []
    for root in TEXT_HYGIENE_ROOTS:
        if root.is_file():
            candidates = [root]
        else:
            candidates = sorted(root.rglob("*"))
        for file in candidates:
            if not file.is_file() or file.suffix not in TEXT_HYGIENE_EXTENSIONS:
                continue
            if SKIP_DIRS.intersection(file.relative_to(ROOT).parts):
                continue
            files.append(file)
    return files
