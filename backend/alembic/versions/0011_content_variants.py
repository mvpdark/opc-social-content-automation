"""Add content variants.

Revision ID: 0011_content_variants
Revises: 0010_user_domain_key
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa


revision = "0011_content_variants"
down_revision = "0010_user_domain_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_variants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("variant_type", sa.String(length=40), nullable=False),
        sa.Column("variant_text", sa.Text(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("selected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["content_id"], ["contents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_content_variants_id", "content_variants", ["id"])
    op.create_index("ix_content_variants_content_id", "content_variants", ["content_id"])
    op.create_index("ix_content_variants_variant_type", "content_variants", ["variant_type"])
    op.create_index("ix_content_variants_selected", "content_variants", ["selected"])


def downgrade() -> None:
    op.drop_index("ix_content_variants_selected", table_name="content_variants")
    op.drop_index("ix_content_variants_variant_type", table_name="content_variants")
    op.drop_index("ix_content_variants_content_id", table_name="content_variants")
    op.drop_index("ix_content_variants_id", table_name="content_variants")
    op.drop_table("content_variants")
