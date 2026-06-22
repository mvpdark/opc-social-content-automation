"""BACKLOG #14 显式任务生命周期模型测试。"""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.task_states import (
    ALLOWED_TRANSITIONS,
    TaskState,
    allowed_next_states,
    can_transition,
    infer_task_state_from_status,
    task_state_label,
    transition_task,
)
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.content import Content


# ---------------------------------------------------------------------------
# 状态机纯函数测试
# ---------------------------------------------------------------------------


def test_task_state_enum_values() -> None:
    assert TaskState.NEW.value == "new"
    assert TaskState.MATERIAL_READY.value == "material_ready"
    assert TaskState.GENERATING.value == "generating"
    assert TaskState.DRAFT_READY.value == "draft_ready"
    assert TaskState.REVIEWING.value == "reviewing"
    assert TaskState.READY_TO_PUBLISH.value == "ready_to_publish"
    assert TaskState.PUBLISHED.value == "published"
    assert TaskState.FAILED.value == "failed"


def test_task_state_label_returns_chinese() -> None:
    assert task_state_label("new") == "新建"
    assert task_state_label("material_ready") == "素材就绪"
    assert task_state_label("generating") == "生成中"
    assert task_state_label("draft_ready") == "草稿就绪"
    assert task_state_label("reviewing") == "审核中"
    assert task_state_label("ready_to_publish") == "待发布"
    assert task_state_label("published") == "已发布"
    assert task_state_label("failed") == "失败"
    assert task_state_label(TaskState.DRAFT_READY) == "草稿就绪"


def test_task_state_label_rejects_unknown_state() -> None:
    with pytest.raises(HTTPException) as exc_info:
        task_state_label("unknown_state")
    assert exc_info.value.status_code == 400


def test_can_transition_allows_valid_paths() -> None:
    assert can_transition("new", "material_ready") is True
    assert can_transition("new", "generating") is True
    assert can_transition("new", "failed") is True
    assert can_transition("material_ready", "generating") is True
    assert can_transition("material_ready", "failed") is True
    assert can_transition("generating", "draft_ready") is True
    assert can_transition("generating", "failed") is True
    assert can_transition("draft_ready", "reviewing") is True
    assert can_transition("draft_ready", "ready_to_publish") is True
    assert can_transition("draft_ready", "failed") is True
    assert can_transition("reviewing", "draft_ready") is True
    assert can_transition("reviewing", "ready_to_publish") is True
    assert can_transition("reviewing", "failed") is True
    assert can_transition("ready_to_publish", "published") is True
    assert can_transition("ready_to_publish", "reviewing") is True
    assert can_transition("ready_to_publish", "failed") is True
    assert can_transition("failed", "new") is True


def test_can_transition_rejects_invalid_paths() -> None:
    # published 是终态，不能转到任何状态。
    for target in TaskState:
        assert can_transition("published", target) is False
    # 不能跳过中间状态。
    assert can_transition("new", "draft_ready") is False
    assert can_transition("new", "published") is False
    assert can_transition("material_ready", "draft_ready") is False
    assert can_transition("generating", "reviewing") is False
    assert can_transition("draft_ready", "published") is False
    assert can_transition("failed", "published") is False
    assert can_transition("failed", "draft_ready") is False


def test_published_is_terminal() -> None:
    assert ALLOWED_TRANSITIONS[TaskState.PUBLISHED] == frozenset()
    assert allowed_next_states("published") == []


def test_allowed_next_states_returns_strings() -> None:
    result = allowed_next_states("new")
    assert isinstance(result, list)
    assert all(isinstance(item, str) for item in result)
    assert set(result) == {"material_ready", "generating", "failed"}


def test_infer_task_state_from_status() -> None:
    assert infer_task_state_from_status("draft") == "draft_ready"
    assert infer_task_state_from_status("rewritten") == "draft_ready"
    assert infer_task_state_from_status("review_pending") == "reviewing"
    assert infer_task_state_from_status("approved") == "ready_to_publish"
    assert infer_task_state_from_status("changes_requested") == "draft_ready"
    assert infer_task_state_from_status("rejected") == "draft_ready"
    assert infer_task_state_from_status("published") == "published"
    assert infer_task_state_from_status(None) == "new"
    assert infer_task_state_from_status("unknown") == "new"


# ---------------------------------------------------------------------------
# transition_task 数据库函数测试
# ---------------------------------------------------------------------------


def _make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _seed_content(session_local, *, task_state="new", status="draft", title="测试内容"):
    with session_local() as db:
        content = Content(
            platform="xiaohongshu",
            title=title,
            body=f"{title} 正文",
            tags=["测试"],
            status=status,
            task_state=task_state,
            task_state_updated_at=datetime.now(timezone.utc),
        )
        db.add(content)
        db.commit()
        db.refresh(content)
        return content.id


def test_transition_task_success() -> None:
    session_local = _make_session()
    content_id = _seed_content(session_local, task_state="new")

    with session_local() as db:
        content = transition_task(db, content_id, "material_ready")
        assert content.task_state == "material_ready"
        assert content.task_state_updated_at is not None


def test_transition_task_rejects_invalid_transition() -> None:
    session_local = _make_session()
    content_id = _seed_content(session_local, task_state="new")

    with session_local() as db:
        with pytest.raises(HTTPException) as exc_info:
            transition_task(db, content_id, "published")
        assert exc_info.value.status_code == 409
        assert "不允许的状态转换" in str(exc_info.value.detail)


def test_transition_task_404_when_content_missing() -> None:
    session_local = _make_session()

    with session_local() as db:
        with pytest.raises(HTTPException) as exc_info:
            transition_task(db, 99999, "material_ready")
        assert exc_info.value.status_code == 404


def test_transition_task_rejects_unknown_state() -> None:
    session_local = _make_session()
    content_id = _seed_content(session_local, task_state="new")

    with session_local() as db:
        with pytest.raises(HTTPException) as exc_info:
            transition_task(db, content_id, "unknown_state")
        assert exc_info.value.status_code == 400


def test_transition_task_full_happy_path() -> None:
    """测试从 new 到 published 的完整合法路径。"""
    session_local = _make_session()
    content_id = _seed_content(session_local, task_state="new")

    path = [
        "material_ready",
        "generating",
        "draft_ready",
        "reviewing",
        "ready_to_publish",
        "published",
    ]
    with session_local() as db:
        for target in path:
            content = transition_task(db, content_id, target)
            assert content.task_state == target
        # published 是终态，不能再转换。
        assert allowed_next_states(content.task_state) == []


def test_transition_task_failed_retry_cycle() -> None:
    """测试 failed -> new 重试循环。"""
    session_local = _make_session()
    content_id = _seed_content(session_local, task_state="generating")

    with session_local() as db:
        content = transition_task(db, content_id, "failed")
        assert content.task_state == "failed"

        content = transition_task(db, content_id, "new")
        assert content.task_state == "new"

        # 从 new 可以重新开始。
        content = transition_task(db, content_id, "generating")
        assert content.task_state == "generating"


# ---------------------------------------------------------------------------
# API 端点测试
# ---------------------------------------------------------------------------


def _client_and_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), testing_session


def test_get_task_state_endpoint() -> None:
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session, task_state="draft_ready", title="草稿")

    response = client.get(f"/api/content/{content_id}/task-state")
    assert response.status_code == 200
    data = response.json()
    assert data["content_id"] == content_id
    assert data["task_state"] == "draft_ready"
    assert data["task_state_label"] == "草稿就绪"
    assert set(data["allowed_next_states"]) == {"reviewing", "ready_to_publish", "failed"}


def test_get_task_state_endpoint_404() -> None:
    client, _ = _client_and_session()
    response = client.get("/api/content/99999/task-state")
    assert response.status_code == 404


def test_post_task_state_endpoint_success() -> None:
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session, task_state="new", title="新建内容")

    response = client.post(
        f"/api/content/{content_id}/task-state",
        json={"to_state": "generating"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["task_state"] == "generating"
    assert data["task_state_label"] == "生成中"
    assert set(data["allowed_next_states"]) == {"draft_ready", "failed"}


def test_post_task_state_endpoint_rejects_invalid_transition() -> None:
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session, task_state="new", title="新建内容")

    response = client.post(
        f"/api/content/{content_id}/task-state",
        json={"to_state": "published"},
    )
    assert response.status_code == 409
    assert "不允许的状态转换" in response.json()["detail"]


def test_post_task_state_endpoint_rejects_unknown_state() -> None:
    client, testing_session = _client_and_session()
    content_id = _seed_content(testing_session, task_state="new", title="新建内容")

    response = client.post(
        f"/api/content/{content_id}/task-state",
        json={"to_state": "unknown_state"},
    )
    assert response.status_code == 400


def test_post_task_state_endpoint_404() -> None:
    client, _ = _client_and_session()
    response = client.post(
        "/api/content/99999/task-state",
        json={"to_state": "generating"},
    )
    assert response.status_code == 404


def test_content_read_includes_task_state() -> None:
    """验证 ContentRead 响应包含 task_state 字段。"""
    client, testing_session = _client_and_session()
    content_id = _seed_content(
        testing_session, task_state="reviewing", status="review_pending", title="审核中"
    )

    response = client.get(f"/api/content/{content_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["task_state"] == "reviewing"
    assert data["task_state_updated_at"] is not None
