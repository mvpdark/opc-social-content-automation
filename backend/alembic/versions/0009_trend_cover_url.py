"""Add trend cover URL.

Revision ID: 0009_trend_cover_url
Revises: 0008_content_source_context
Create Date: 2026-06-14
"""
from alembic import op
import sqlalchemy as sa


revision = "0009_trend_cover_url"
down_revision = "0008_content_source_context"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trend_contents", sa.Column("cover_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("trend_contents", "cover_url")
