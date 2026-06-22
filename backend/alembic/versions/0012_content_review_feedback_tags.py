"""Add content review feedback tags.

Revision ID: 0012_content_review_feedback_tags
Revises: 0011_content_variants
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa


revision = "0012_content_review_feedback_tags"
down_revision = "0011_content_variants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "content_reviews",
        sa.Column("feedback_tags", sa.JSON(), nullable=True),
    )
    op.add_column(
        "content_reviews",
        sa.Column("feedback_category", sa.String(length=40), nullable=True),
    )
    op.create_index(
        "ix_content_reviews_feedback_category",
        "content_reviews",
        ["feedback_category"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_content_reviews_feedback_category",
        table_name="content_reviews",
    )
    op.drop_column("content_reviews", "feedback_category")
    op.drop_column("content_reviews", "feedback_tags")
