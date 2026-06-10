"""Add content reviews.

Revision ID: 0005_content_reviews
Revises: 0004_generation_log_metadata
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_content_reviews"
down_revision = "0004_generation_log_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), nullable=True),
        sa.Column("review_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("risk_flags", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["content_id"], ["contents.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_reviews_id", "content_reviews", ["id"])
    op.create_index("ix_content_reviews_content_id", "content_reviews", ["content_id"])
    op.create_index("ix_content_reviews_review_type", "content_reviews", ["review_type"])
    op.create_index("ix_content_reviews_status", "content_reviews", ["status"])


def downgrade() -> None:
    op.drop_index("ix_content_reviews_status", table_name="content_reviews")
    op.drop_index("ix_content_reviews_review_type", table_name="content_reviews")
    op.drop_index("ix_content_reviews_content_id", table_name="content_reviews")
    op.drop_index("ix_content_reviews_id", table_name="content_reviews")
    op.drop_table("content_reviews")
