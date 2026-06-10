"""Initial OPC schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("nickname", sa.String(length=80), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "contents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contents_id", "contents", ["id"])
    op.create_index("ix_contents_platform", "contents", ["platform"])
    op.create_index("ix_contents_status", "contents", ["status"])

    op.create_table(
        "knowledge_base",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_base_id", "knowledge_base", ["id"])
    op.create_index("ix_knowledge_base_title", "knowledge_base", ["title"])
    op.create_index("ix_knowledge_base_category", "knowledge_base", ["category"])

    op.create_table(
        "trend_contents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("author", sa.String(length=120), nullable=True),
        sa.Column("publish_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("likes", sa.Integer(), nullable=False),
        sa.Column("favorites", sa.Integer(), nullable=False),
        sa.Column("comments", sa.Integer(), nullable=False),
        sa.Column("shares", sa.Integer(), nullable=False),
        sa.Column("video_transcript", sa.Text(), nullable=True),
        sa.Column("screenshot_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trend_contents_id", "trend_contents", ["id"])
    op.create_index("ix_trend_contents_platform", "trend_contents", ["platform"])
    op.create_index("ix_trend_contents_author", "trend_contents", ["author"])

    op.create_table(
        "generated_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["content_id"], ["contents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generated_images_id", "generated_images", ["id"])
    op.create_index("ix_generated_images_content_id", "generated_images", ["content_id"])

    op.create_table(
        "generation_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generation_logs_id", "generation_logs", ["id"])
    op.create_index("ix_generation_logs_model", "generation_logs", ["model"])


def downgrade() -> None:
    op.drop_index("ix_generation_logs_model", table_name="generation_logs")
    op.drop_index("ix_generation_logs_id", table_name="generation_logs")
    op.drop_table("generation_logs")
    op.drop_index("ix_generated_images_content_id", table_name="generated_images")
    op.drop_index("ix_generated_images_id", table_name="generated_images")
    op.drop_table("generated_images")
    op.drop_index("ix_trend_contents_author", table_name="trend_contents")
    op.drop_index("ix_trend_contents_platform", table_name="trend_contents")
    op.drop_index("ix_trend_contents_id", table_name="trend_contents")
    op.drop_table("trend_contents")
    op.drop_index("ix_knowledge_base_category", table_name="knowledge_base")
    op.drop_index("ix_knowledge_base_title", table_name="knowledge_base")
    op.drop_index("ix_knowledge_base_id", table_name="knowledge_base")
    op.drop_table("knowledge_base")
    op.drop_index("ix_contents_status", table_name="contents")
    op.drop_index("ix_contents_platform", table_name="contents")
    op.drop_index("ix_contents_id", table_name="contents")
    op.drop_table("contents")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
