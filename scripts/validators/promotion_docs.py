from __future__ import annotations

from ._helpers import ROOT

def validate_promotion_precision_loop_docs() -> int:
    files_and_snippets = [
        (
            ROOT / "docs" / "loop-engineering" / "PROMOTION_PRECISION.md",
            [
                "topic intent -> fact ledger -> promotion brief -> draft variants -> safety/quality scoring -> human confirmation",
                "Ranking/list topics",
                "Route/decision topics",
                "Mentor-matching topics",
                "Timing/schedule topics",
                "Sales/marketing topics",
                "Source-check topics",
                "Fact Ledger",
                "Promotion Brief",
                "Variants and Scoring",
                "Cover and Title Coupling",
                "Publish-Readiness Review",
                "Feedback Loop",
                "Do not accept a model-provider change as a complete loop",
            ],
            "promotion precision guide",
        ),
        (
            ROOT / "AGENTS.md",
            [
                "Promotion precision objective",
                "classify topic intent before drafting",
                "build or reference a fact ledger/source cards",
                "create a promotion brief",
                "score or flag drafts for source safety",
                "docs/loop-engineering/PROMOTION_PRECISION.md",
            ],
            "AGENTS promotion precision rules",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "CODEX_MASTER_PROMPT.md",
            [
                "docs/loop-engineering/PROMOTION_PRECISION.md",
                "Improve postgraduate-to-PhD promotion precision",
                "topic intent routing",
                "fact ledger/source cards",
                "promotion brief",
                "quality and safety scoring before copy/export",
            ],
            "master prompt promotion precision priority",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "BACKLOG_SEEDS.md",
            [
                "Promotion topic intent router",
                "Fact ledger source cards",
                "Promotion brief before drafting",
                "Variants and draft scoring",
                "Feedback labels for future generation",
            ],
            "promotion precision backlog",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "PRODUCT_ACCEPTANCE.md",
            [
                "Postgraduate-to-PhD promotion precision",
                "Detect or preserve topic intent",
                "Build or reference a promotion brief",
                "Fall back to a verification framework",
                "Score drafts for topic-intent alignment",
            ],
            "promotion precision acceptance",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "EVAL_MATRIX.md",
            [
                "Promotion Precision Bonus Guidance",
                "lead-generation precision",
                "topic-intent alignment",
                "evidence-backed claims",
                "pure provider/model swaps",
            ],
            "promotion precision evaluation",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "LOOP_ENGINEERING_RUNBOOK.md",
            [
                "A ranking/list topic drifts into mentor matching",
                "source-check topic names schools",
                "promotion brief, CTA, or lead-generation intent",
                "Do not accept a model-provider change as a complete loop",
            ],
            "promotion precision runbook",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "PLAYWRIGHT_E2E_SPEC.md",
            [
                "Promotion precision smoke",
                "Recommended and custom topics preserve their detected intent",
                "Ranking/list topics stay ranking/list topics",
                "Missing current-fact sources do not produce school lists",
            ],
            "promotion precision E2E spec",
        ),
        (
            ROOT / "docs" / "loop-engineering" / "LOOP_LOG_TEMPLATE.md",
            [
                "Promotion precision evidence, if applicable",
                "Topic intent:",
                "Fact/source ledger:",
                "Promotion brief:",
                "CTA and conversion clarity:",
                "Cover/title/body consistency:",
                "Manual review readiness:",
            ],
            "promotion precision loop log template",
        ),
        (
            ROOT / "PROJECT_MAP.md",
            [
                "Loop Engineering promotion precision now targets",
                "topic-intent routing",
                "fact-ledger/source cards",
                "promotion briefs",
                "feedback labels",
            ],
            "project map promotion precision",
        ),
    ]
    total = 0
    for path, snippets, label in files_and_snippets:
        text = path.read_text(encoding="utf-8")
        for snippet in snippets:
            total += 1
            if snippet not in text:
                raise SystemExit(f"Missing {label} contract: {snippet}")
    return total
