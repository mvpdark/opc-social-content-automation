"""Add publish records.

Revision ID: 0002_publish_records
Revises: 0001_initial
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_publish_records"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "publish_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("external_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["content_id"], ["contents.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_publish_records_id", "publish_records", ["id"])
    op.create_index("ix_publish_records_content_id", "publish_records", ["content_id"])
    op.create_index("ix_publish_records_platform", "publish_records", ["platform"])
    op.create_index("ix_publish_records_status", "publish_records", ["status"])


def downgrade() -> None:
    op.drop_index("ix_publish_records_status", table_name="publish_records")
    op.drop_index("ix_publish_records_platform", table_name="publish_records")
    op.drop_index("ix_publish_records_content_id", table_name="publish_records")
    op.drop_index("ix_publish_records_id", table_name="publish_records")
    op.drop_table("publish_records")
