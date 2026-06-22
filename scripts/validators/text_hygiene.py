from __future__ import annotations

from ._helpers import ROOT, FORBIDDEN_TEXT_MARKERS, _iter_text_hygiene_files


def validate_text_hygiene() -> int:
    files = _iter_text_hygiene_files()
    failures: list[str] = []
    escaped_markers = [marker for marker in FORBIDDEN_TEXT_MARKERS if marker.startswith("\\u")]
    if escaped_markers:
        raise SystemExit(
            "Text hygiene markers must be actual Unicode characters, not escaped literals: "
            + ", ".join(repr(marker) for marker in escaped_markers)
        )
    for file in files:
        text = file.read_text(encoding="utf-8")
        for marker, reason in FORBIDDEN_TEXT_MARKERS.items():
            index = text.find(marker)
            if index == -1:
                continue
            line_number = text.count("\n", 0, index) + 1
            rel_path = file.relative_to(ROOT)
            failures.append(f"{rel_path}:{line_number} contains {reason} {marker!r}")
    if failures:
        raise SystemExit("Text hygiene check failed:\n" + "\n".join(failures))
    return len(files)

