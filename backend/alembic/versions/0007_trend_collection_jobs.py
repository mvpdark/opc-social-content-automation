"""Add trend collection jobs.

Revision ID: 0007_trend_collection_jobs
Revises: 0006_generated_image_metadata
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "0007_trend_collection_jobs"
down_revision = "0006_generated_image_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trend_collection_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("keyword", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("requested_by", sa.Integer(), nullable=True),
        sa.Column("safety_profile", sa.JSON(), nullable=False),
        sa.Column("result_summary", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trend_collection_jobs_id", "trend_collection_jobs", ["id"])
    op.create_index("ix_trend_collection_jobs_platform", "trend_collection_jobs", ["platform"])
    op.create_index("ix_trend_collection_jobs_keyword", "trend_collection_jobs", ["keyword"])
    op.create_index("ix_trend_collection_jobs_status", "trend_collection_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_trend_collection_jobs_status", table_name="trend_collection_jobs")
    op.drop_index("ix_trend_collection_jobs_keyword", table_name="trend_collection_jobs")
    op.drop_index("ix_trend_collection_jobs_platform", table_name="trend_collection_jobs")
    op.drop_index("ix_trend_collection_jobs_id", table_name="trend_collection_jobs")
    op.drop_table("trend_collection_jobs")
