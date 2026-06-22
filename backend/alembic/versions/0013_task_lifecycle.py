"""Add task lifecycle state machine columns.

Revision ID: 0013_task_lifecycle
Revises: 0012_content_review_feedback_tags
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa


revision = "0013_task_lifecycle"
down_revision = "0012_content_review_feedback_tags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contents",
        sa.Column("task_state", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "contents",
        sa.Column("task_state_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_contents_task_state",
        "contents",
        ["task_state"],
    )

    # 数据迁移：根据现有 status 字段推断初始 task_state。
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, status FROM contents")).fetchall()
    status_mapping = {
        "draft": "draft_ready",
        "rewritten": "draft_ready",
        "review_pending": "reviewing",
        "approved": "ready_to_publish",
        "changes_requested": "draft_ready",
        "rejected": "draft_ready",
        "published": "published",
    }
    for row in rows:
        status_value = row[1] if row[1] else "draft"
        task_state = status_mapping.get(status_value, "new")
        conn.execute(
            sa.text(
                "UPDATE contents SET task_state = :task_state WHERE id = :id"
            ),
            {"task_state": task_state, "id": row[0]},
        )


def downgrade() -> None:
    op.drop_index("ix_contents_task_state", table_name="contents")
    op.drop_column("contents", "task_state_updated_at")
    op.drop_column("contents", "task_state")
