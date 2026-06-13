"""Add content source context.

Revision ID: 0008_content_source_context
Revises: 0007_trend_collection_jobs
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa


revision = "0008_content_source_context"
down_revision = "0007_trend_collection_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contents", sa.Column("source_context", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("contents", "source_context")
