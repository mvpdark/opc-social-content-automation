"""Add user domain key.

Revision ID: 0010_user_domain_key
Revises: 0009_trend_cover_url
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa


revision = "0010_user_domain_key"
down_revision = "0009_trend_cover_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "domain_key",
            sa.String(length=32),
            nullable=False,
            server_default="ssb",
        ),
    )
    op.create_index("ix_users_domain_key", "users", ["domain_key"])


def downgrade() -> None:
    op.drop_index("ix_users_domain_key", table_name="users")
    op.drop_column("users", "domain_key")
