"""Add generated image metadata.

Revision ID: 0006_generated_image_metadata
Revises: 0005_content_reviews
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "0006_generated_image_metadata"
down_revision = "0005_content_reviews"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("generated_images", sa.Column("created_by", sa.Integer(), nullable=True))
    op.add_column("generated_images", sa.Column("template", sa.String(length=120), nullable=True))
    op.add_column("generated_images", sa.Column("prompt", sa.Text(), nullable=True))
    op.add_column(
        "generated_images",
        sa.Column("status", sa.String(length=40), nullable=False, server_default="generated"),
    )
    op.add_column("generated_images", sa.Column("error", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_generated_images_created_by_users",
        "generated_images",
        "users",
        ["created_by"],
        ["id"],
    )
    op.create_index("ix_generated_images_created_by", "generated_images", ["created_by"])
    op.create_index("ix_generated_images_status", "generated_images", ["status"])
    op.alter_column("generated_images", "status", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_generated_images_status", table_name="generated_images")
    op.drop_index("ix_generated_images_created_by", table_name="generated_images")
    op.drop_constraint(
        "fk_generated_images_created_by_users",
        "generated_images",
        type_="foreignkey",
    )
    op.drop_column("generated_images", "error")
    op.drop_column("generated_images", "status")
    op.drop_column("generated_images", "prompt")
    op.drop_column("generated_images", "template")
    op.drop_column("generated_images", "created_by")
