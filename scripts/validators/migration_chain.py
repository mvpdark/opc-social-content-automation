from __future__ import annotations

from ._helpers import ROOT

def validate_migration_chain() -> int:
    versions_dir = ROOT / "backend" / "alembic" / "versions"
    versions = sorted(versions_dir.glob("*.py"))
    expected_pairs = [
        ('revision = "0001_initial"', "down_revision = None"),
        ('revision = "0002_publish_records"', 'down_revision = "0001_initial"'),
        (
            'revision = "0003_knowledge_embedding_index"',
            'down_revision = "0002_publish_records"',
        ),
        (
            'revision = "0004_generation_log_metadata"',
            'down_revision = "0003_knowledge_embedding_index"',
        ),
        ('revision = "0005_content_reviews"', 'down_revision = "0004_generation_log_metadata"'),
        (
            'revision = "0006_generated_image_metadata"',
            'down_revision = "0005_content_reviews"',
        ),
        (
            'revision = "0007_trend_collection_jobs"',
            'down_revision = "0006_generated_image_metadata"',
        ),
        (
            'revision = "0008_content_source_context"',
            'down_revision = "0007_trend_collection_jobs"',
        ),
    ]
    for expected_revision, expected_parent in expected_pairs:
        if not any(
            expected_revision in file.read_text(encoding="utf-8")
            and expected_parent in file.read_text(encoding="utf-8")
            for file in versions
        ):
            raise SystemExit(f"Migration chain is missing {expected_revision}")
    return len(expected_pairs)
