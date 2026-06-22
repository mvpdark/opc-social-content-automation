from __future__ import annotations

import random
import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent
from app.services.trend_browser_parsers import (
    BLOCKED_MARKERS,
    VIDEO_MARKERS,
    CollectedTrendAsset,
    _blocked_candidate_count,
    _enrich_assets_from_detail_pages,
    _merge_detail_asset,
    _parse_xhs_publish_time,
    extract_candidate_assets,
    normalize_visible_text,
)
from app.services.trend_browser_scripts import raw_visible_items_script

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BROWSER_SESSION_ROOT = PROJECT_ROOT / ".browser-sessions"
VIDEO_COLLECTION_DISABLED_DETAIL = (
    "视频采集暂未启用；需要先补齐转写、版权和人工复核流程。"
)

__all__ = [
    "CollectedTrendAsset",
    "_blocked_candidate_count",
    "_content_kind",
    "_merge_detail_asset",
    "_operator_wait_seconds",
    "_parse_xhs_publish_time",
    "collection_session_dir",
    "extract_candidate_assets",
    "normalize_visible_text",
    "run_browser_collection_job",
]


def collection_session_dir(
    platform: str,
    keyword: str = "",
    session_label: str | None = None,
) -> Path:
    label = str(session_label or platform or f"{platform}-{keyword}")
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-")[:80]
    return BROWSER_SESSION_ROOT / (safe_label or f"{platform}-session")


def _session_dir(job: TrendCollectionJob) -> Path:
    profile = job.safety_profile or {}
    session_label = profile.get("session_label")
    return collection_session_dir(
        platform=job.platform,
        keyword=job.keyword,
        session_label=str(session_label) if session_label else None,
    )


def _target_url(job: TrendCollectionJob) -> str:
    profile = job.safety_profile or {}
    target = profile.get("target")
    if isinstance(target, dict) and target.get("search_url"):
        return str(target["search_url"])
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="采集任务缺少搜索目标。",
    )


def _safe_max_items(job: TrendCollectionJob) -> int:
    profile = job.safety_profile or {}
    max_items = profile.get("max_items")
    if isinstance(max_items, int):
        return max(1, min(max_items, 100))
    return 20


def _content_kind(job: TrendCollectionJob) -> str:
    profile = job.safety_profile or {}
    content_kind = profile.get("content_kind")
    if content_kind in {"video", "mixed"}:
        # 安全门：VIDEO_MARKERS / BLOCKED_MARKERS 由 trend_browser_parsers 负责过滤，
        # 此处仅拒绝以视频为主的采集请求，确保只采集图文素材。
        _ = (VIDEO_MARKERS, BLOCKED_MARKERS)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=VIDEO_COLLECTION_DISABLED_DETAIL,
        )
    if content_kind == "image_text":
        return content_kind
    return "image_text"


def _delay_window(job: TrendCollectionJob) -> tuple[int, int]:
    profile = job.safety_profile or {}
    delays = profile.get("randomized_delay_seconds")
    if isinstance(delays, dict):
        minimum = int(delays.get("min") or 4)
        maximum = int(delays.get("max") or 12)
        if minimum < maximum:
            return minimum, maximum
    return 4, 12


def _operator_wait_seconds(job: TrendCollectionJob) -> int:
    profile = job.safety_profile or {}
    value = profile.get("operator_wait_seconds")
    if isinstance(value, int):
        return max(0, min(value, 180))
    return 30


def _store_assets(
    db: Session,
    job: TrendCollectionJob,
    assets: list[CollectedTrendAsset],
    *,
    raw_candidate_count: int = 0,
    blocked_candidate_count: int = 0,
    page_title: str | None = None,
    final_url: str | None = None,
    operator_wait_seconds: int = 0,
) -> list[TrendContent]:
    stored: list[TrendContent] = []
    for asset in assets:
        item = TrendContent(
            platform=asset.platform,
            title=asset.title,
            content=asset.content,
            author=asset.author,
            publish_time=asset.publish_time,
            url=asset.url,
            tags=asset.tags,
            likes=asset.likes,
            favorites=asset.favorites,
            comments=asset.comments,
            shares=asset.shares,
            cover_url=asset.cover_url,
            video_transcript=None,
            screenshot_url=None,
        )
        db.add(item)
        stored.append(item)

    job.status = "completed" if stored else "needs_operator_review"
    if stored:
        message = "已从持久化采集浏览器会话采集公开图文素材。"
    elif blocked_candidate_count:
        message = (
            "未找到可采集的公开图文素材。当前页面可能被登录、验证、页脚备案或平台外壳文本拦截；"
            "请只在合规允许时打开登录浏览器处理，然后重试。"
        )
    elif raw_candidate_count:
        message = (
            "未找到可采集的公开图文素材。页面已有可见文本，但没有匹配图文过滤条件的安全候选；"
            "请换更宽的关键词，或粘贴笔记链接导入。"
        )
    else:
        message = (
            "未找到可采集的公开图文素材。请确认登录浏览器已完成登录，然后重试。"
        )
    job.result_summary = {
        "message": message,
        "collected_items": len(stored),
        "raw_candidates": raw_candidate_count,
        "blocked_candidates": blocked_candidate_count,
        "page_title": page_title,
        "final_url": final_url,
        "operator_wait_seconds": operator_wait_seconds,
        "trend_ids": [],
    }
    db.commit()

    for item in stored:
        db.refresh(item)
    job.result_summary = {
        **(job.result_summary or {}),
        "trend_ids": [item.id for item in stored],
    }
    db.commit()
    db.refresh(job)
    return stored


def run_browser_collection_job(
    db: Session,
    job_id: int,
    *,
    headless: bool = False,
    operator_wait_seconds: int | None = None,
    max_scrolls: int = 6,
) -> list[TrendContent]:
    job = db.get(TrendCollectionJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到采集任务。",
        )

    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="采集器依赖未安装。",
        ) from exc

    target_url = _target_url(job)
    max_items = _safe_max_items(job)
    content_kind = _content_kind(job)
    min_delay, max_delay = _delay_window(job)
    operator_wait_seconds = (
        _operator_wait_seconds(job)
        if operator_wait_seconds is None
        else max(0, min(operator_wait_seconds, 180))
    )
    session_dir = _session_dir(job)
    session_dir.mkdir(parents=True, exist_ok=True)

    job.status = "running"
    job.result_summary = {
        "message": "采集浏览器已启动。",
        "target_url": target_url,
        "content_kind": content_kind,
        "collected_items": 0,
        "operator_wait_seconds": operator_wait_seconds,
    }
    job.error = None
    db.commit()
    db.refresh(job)

    raw_items: list[dict[str, Any]] = []
    assets: list[CollectedTrendAsset] = []
    page_title: str | None = None
    final_url: str | None = target_url
    try:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(session_dir),
                headless=headless,
                slow_mo=250,
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()
            page.goto(target_url, wait_until="domcontentloaded", timeout=60_000)
            page_title = page.title()
            final_url = page.url
            if operator_wait_seconds > 0:
                page.wait_for_timeout(operator_wait_seconds * 1000)

            for _ in range(max(1, max_scrolls)):
                evaluated_items = page.evaluate(raw_visible_items_script()) or []
                raw_items.extend(evaluated_items)
                page_title = page.title()
                final_url = page.url
                if (
                    len(
                        extract_candidate_assets(
                            raw_items,
                            job.platform,
                            job.keyword,
                            max_items,
                            content_kind=content_kind,
                        )
                    )
                    >= max_items
                ):
                    break
                page.mouse.move(random.randint(280, 980), random.randint(240, 760))
                page.mouse.wheel(0, random.randint(480, 980))
                page.wait_for_timeout(random.randint(min_delay, max_delay) * 1000)

            assets = extract_candidate_assets(
                raw_items,
                job.platform,
                job.keyword,
                max_items,
                content_kind=content_kind,
            )
            assets = _enrich_assets_from_detail_pages(page, assets, job.keyword)
            context.close()
    except PlaywrightTimeoutError as exc:
        job.status = "needs_operator_review"
        job.error = "采集浏览器加载平台页面超时。"
        job.result_summary = {
            "message": "请先重试公开搜索；只有公开结果被拦截时，再打开登录浏览器处理登录或验证码。",
            "target_url": target_url,
            "collected_items": 0,
        }
        db.commit()
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=job.error) from exc
    except Exception:
        job.status = "failed"
        job.error = "采集浏览器采集失败，请检查本机浏览器环境和会话状态。"
        job.result_summary = {
            "message": job.error,
            "target_url": target_url,
            "collected_items": 0,
        }
        db.commit()
        raise

    if not assets:
        assets = extract_candidate_assets(
            raw_items,
            job.platform,
            job.keyword,
            max_items,
            content_kind=content_kind,
        )
    return _store_assets(
        db=db,
        job=job,
        assets=assets,
        raw_candidate_count=len(raw_items),
        blocked_candidate_count=_blocked_candidate_count(raw_items),
        page_title=page_title,
        final_url=final_url,
        operator_wait_seconds=operator_wait_seconds,
    )
