import re
from collections import Counter, defaultdict

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent
from app.models.user import User
from app.schemas.trend import (
    KeywordAnalysisItem,
    TrendCollectRequest,
    TrendCollectionJobCreate,
)


TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)
STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "一个",
    "什么",
    "如何",
    "怎么",
    "我们",
}


def build_safety_profile(payload: TrendCollectionJobCreate) -> dict[str, object]:
    if payload.min_delay_seconds >= payload.max_delay_seconds:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_delay_seconds must be lower than max_delay_seconds.",
        )

    return {
        "collector": "playwright_assisted",
        "human_like_scrolling": True,
        "randomized_delay_seconds": {
            "min": payload.min_delay_seconds,
            "max": payload.max_delay_seconds,
        },
        "randomized_interaction_paths": True,
        "session_persistence": payload.persist_session,
        "cookie_persistence": payload.persist_cookies,
        "session_label": payload.session_label,
        "max_items": payload.max_items,
        "speed_policy": "account_safety_first",
    }


def create_collection_job(
    db: Session,
    payload: TrendCollectionJobCreate,
    current_user: User,
) -> TrendCollectionJob:
    job = TrendCollectionJob(
        platform=payload.platform,
        keyword=payload.keyword,
        requested_by=current_user.id,
        status="queued",
        safety_profile=build_safety_profile(payload),
        result_summary={
            "message": "Queued for safe Playwright-assisted collection.",
            "collected_items": 0,
        },
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def list_collection_jobs(
    db: Session,
    platform: str | None,
    status_filter: str | None,
    limit: int,
) -> list[TrendCollectionJob]:
    statement = select(TrendCollectionJob).order_by(desc(TrendCollectionJob.created_at)).limit(limit)
    if platform:
        statement = statement.where(TrendCollectionJob.platform == platform)
    if status_filter:
        statement = statement.where(TrendCollectionJob.status == status_filter)
    return list(db.scalars(statement).all())


def create_trend_asset(
    db: Session,
    payload: TrendCollectRequest,
    current_user: User,
) -> TrendContent:
    _ = current_user
    item = TrendContent(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def trend_report(db: Session) -> dict[str, object]:
    rows = db.execute(
        select(
            TrendContent.platform,
            func.count(TrendContent.id),
            func.coalesce(func.sum(TrendContent.likes), 0),
            func.coalesce(func.sum(TrendContent.favorites), 0),
            func.coalesce(func.sum(TrendContent.comments), 0),
            func.coalesce(func.sum(TrendContent.shares), 0),
        ).group_by(TrendContent.platform)
    ).all()
    return {
        "platforms": [
            {
                "platform": row[0],
                "items": row[1],
                "likes": row[2],
                "favorites": row[3],
                "comments": row[4],
                "shares": row[5],
            }
            for row in rows
        ]
    }


def analyze_keywords(
    db: Session,
    platform: str | None,
    limit: int,
) -> list[KeywordAnalysisItem]:
    statement = select(TrendContent)
    if platform:
        statement = statement.where(TrendContent.platform == platform)
    items = db.scalars(statement).all()

    counts: Counter[str] = Counter()
    platforms: dict[str, set[str]] = defaultdict(set)
    for item in items:
        tokens = list(item.tags or [])
        tokens.extend(TOKEN_RE.findall(f"{item.title} {item.content}".lower()))
        for token in tokens:
            normalized = token.strip("#").lower()
            if len(normalized) < 2 or normalized in STOP_WORDS:
                continue
            counts[normalized] += 1
            platforms[normalized].add(item.platform)

    return [
        KeywordAnalysisItem(
            keyword=keyword,
            count=count,
            platforms=sorted(platforms[keyword]),
        )
        for keyword, count in counts.most_common(limit)
    ]
