"""Add generation log metadata.

Revision ID: 0004_generation_log_metadata
Revises: 0003_knowledge_embedding_index
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_generation_log_metadata"
down_revision = "0003_knowledge_embedding_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "generation_logs",
        sa.Column("purpose", sa.String(length=80), nullable=False, server_default="generation"),
    )
    op.add_column(
        "generation_logs",
        sa.Column("status", sa.String(length=40), nullable=False, server_default="success"),
    )
    op.add_column("generation_logs", sa.Column("error", sa.Text(), nullable=True))
    op.create_index("ix_generation_logs_purpose", "generation_logs", ["purpose"])
    op.create_index("ix_generation_logs_status", "generation_logs", ["status"])
    op.alter_column("generation_logs", "purpose", server_default=None)
    op.alter_column("generation_logs", "status", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_generation_logs_status", table_name="generation_logs")
    op.drop_index("ix_generation_logs_purpose", table_name="generation_logs")
    op.drop_column("generation_logs", "error")
    op.drop_column("generation_logs", "status")
    op.drop_column("generation_logs", "purpose")
