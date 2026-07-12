"""显式任务生命周期状态机（BACKLOG #14）。

将内容生产流程的状态从隐式变为显式：

    new -> material_ready -> generating -> draft_ready
        -> reviewing -> ready_to_publish -> published

任何阶段都可进入 ``failed``，``failed`` 可回到 ``new`` 重试。
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.content import Content

logger = logging.getLogger(__name__)

__all__ = [
    "ALLOWED_TRANSITIONS",
    "TASK_STATE_LABELS",
    "TaskState",
    "can_transition",
    "task_state_label",
    "transition_task",
    "infer_task_state_from_status",
]


class TaskState(str, Enum):
    """内容任务的显式生命周期状态。"""

    NEW = "new"
    MATERIAL_READY = "material_ready"
    GENERATING = "generating"
    DRAFT_READY = "draft_ready"
    REVIEWING = "reviewing"
    READY_TO_PUBLISH = "ready_to_publish"
    PUBLISHED = "published"
    FAILED = "failed"


# 合法状态转换映射。
ALLOWED_TRANSITIONS: dict[TaskState, frozenset[TaskState]] = {
    TaskState.NEW: frozenset(
        {TaskState.MATERIAL_READY, TaskState.GENERATING, TaskState.FAILED}
    ),
    TaskState.MATERIAL_READY: frozenset({TaskState.GENERATING, TaskState.FAILED}),
    TaskState.GENERATING: frozenset({TaskState.DRAFT_READY, TaskState.FAILED}),
    TaskState.DRAFT_READY: frozenset(
        {TaskState.REVIEWING, TaskState.READY_TO_PUBLISH, TaskState.FAILED}
    ),
    TaskState.REVIEWING: frozenset(
        {TaskState.DRAFT_READY, TaskState.READY_TO_PUBLISH, TaskState.FAILED}
    ),
    TaskState.READY_TO_PUBLISH: frozenset(
        {TaskState.PUBLISHED, TaskState.REVIEWING, TaskState.FAILED}
    ),
    TaskState.PUBLISHED: frozenset(),
    TaskState.FAILED: frozenset({TaskState.NEW}),
}


TASK_STATE_LABELS: dict[TaskState, str] = {
    TaskState.NEW: "新建",
    TaskState.MATERIAL_READY: "素材就绪",
    TaskState.GENERATING: "生成中",
    TaskState.DRAFT_READY: "草稿就绪",
    TaskState.REVIEWING: "审核中",
    TaskState.READY_TO_PUBLISH: "待发布",
    TaskState.PUBLISHED: "已发布",
    TaskState.FAILED: "失败",
}


def _coerce_task_state(value: str | TaskState) -> TaskState:
    if isinstance(value, TaskState):
        return value
    try:
        return TaskState(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"未知的任务状态：{value}",
        ) from exc


def task_state_label(state: str | TaskState) -> str:
    """返回任务状态的中文标签。"""
    task_state = _coerce_task_state(state)
    return TASK_STATE_LABELS[task_state]


def can_transition(from_state: str | TaskState, to_state: str | TaskState) -> bool:
    """校验两个状态之间是否存在合法转换。"""
    source = _coerce_task_state(from_state)
    target = _coerce_task_state(to_state)
    return target in ALLOWED_TRANSITIONS.get(source, frozenset())


def allowed_next_states(state: str | TaskState) -> list[str]:
    """返回当前状态可转换到的状态列表（字符串形式，按枚举顺序）。"""
    source = _coerce_task_state(state)
    return [item.value for item in ALLOWED_TRANSITIONS.get(source, frozenset())]


def infer_task_state_from_status(status_value: str | None) -> str:
    """根据旧 ``status`` 字段推断初始 ``task_state``（用于数据迁移）。"""
    mapping = {
        "draft": TaskState.DRAFT_READY.value,
        "rewritten": TaskState.DRAFT_READY.value,
        "review_pending": TaskState.REVIEWING.value,
        "approved": TaskState.READY_TO_PUBLISH.value,
        "changes_requested": TaskState.DRAFT_READY.value,
        "rejected": TaskState.DRAFT_READY.value,
        "published": TaskState.PUBLISHED.value,
    }
    if not status_value:
        return TaskState.NEW.value
    return mapping.get(status_value, TaskState.NEW.value)


def transition_task(
    db: Session,
    content_id: int,
    to_state: str | TaskState,
    *,
    user_id: int | None = None,
) -> Content:
    """执行任务状态转换（含校验）。

    - 内容不存在时返回 404。
    - 非法转换时返回 409。
    - 当提供 ``user_id`` 时，校验调用者对内容的所有权（不匹配返回 403）。
    - 转换成功后更新 ``task_state`` 与 ``task_state_updated_at``。
    """
    content = db.get(Content, content_id, with_for_update=True)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这条内容。",
        )

    if user_id is not None and content.user_id != user_id:
        logger.warning(
            "transition_task ownership check failed: content %s belongs to user %s, "
            "caller user_id=%s",
            content_id, content.user_id, user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作这条内容。",
        )

    current_state = content.task_state or TaskState.NEW.value
    target = _coerce_task_state(to_state)

    if not can_transition(current_state, target):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"不允许的状态转换：{current_state} -> {target.value}。"
                f"当前可转换状态：{', '.join(allowed_next_states(current_state)) or '（终态）'}"
            ),
        )

    content.task_state = target.value
    content.task_state_updated_at = datetime.now(timezone.utc)
    db.flush()
    try:
        db.refresh(content)
    except Exception:
        logger.warning(
            "Failed to refresh content %s after task_state commit",
            content_id,
            exc_info=True,
        )
    return content
