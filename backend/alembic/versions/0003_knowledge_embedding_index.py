"""Add knowledge embedding vector index.

Revision ID: 0003_knowledge_embedding_index
Revises: 0002_publish_records
Create Date: 2026-06-10
"""
from alembic import op


revision = "0003_knowledge_embedding_index"
down_revision = "0002_publish_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_knowledge_base_embedding_hnsw
        ON knowledge_base
        USING hnsw (embedding vector_cosine_ops)
        WHERE embedding IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_knowledge_base_embedding_hnsw")
