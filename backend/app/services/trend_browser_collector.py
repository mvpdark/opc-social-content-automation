from __future__ import annotations

import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.trend_collection_job import TrendCollectionJob
from app.models.trend_content import TrendContent


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BROWSER_SESSION_ROOT = PROJECT_ROOT / ".browser-sessions"
HASHTAG_RE = re.compile(r"[#＃]([\w\u4e00-\u9fff-]{2,40})", re.UNICODE)
SPACE_RE = re.compile(r"\s+")
VIDEO_MARKERS = ("视频", "播放", "直播", "video-card", "video_note", "shorts")
VIDEO_COLLECTION_DISABLED_DETAIL = (
    "Video collection is disabled until a separate transcript and rights review workflow is implemented."
)
BLOCKED_MARKERS = (
    "登录后查看搜索结果",
    "手机号登录",
    "获取验证码",
    "用户协议",
    "隐私政策",
    "扫码登录",
    "温馨提示",
    "广告屏蔽插件",
    "插件白名单",
    "沪ICP备",
    "营业执照",
    "公网安备",
    "增值电信业务经营许可证",
    "医疗器械网络交易服务第三方平台备案",
    "网械平台备字",
    "互联网药品信息服务资格证书",
    "网络文化经营许可证",
    "违法不良信息举报",
    "行吟信息科技",
    "个性化推荐算法",
    "网信算备",
    "beian.miit.gov.cn",
    "beian.cac.gov.cn",
    "agree.xiaohongshu.com",
    "fe-platform",
    ".pdf",
)


@dataclass(frozen=True)
class CollectedTrendAsset:
    platform: str
    title: str
    content: str
    url: str | None
    tags: list[str]


def normalize_visible_text(value: object) -> str:
    return SPACE_RE.sub(" ", str(value or "")).strip()


def _title_from_text(text: str, keyword: str) -> str:
    lines = [line.strip() for line in str(text).splitlines() if line.strip()]
    if not lines:
        return keyword or "Collected trend asset"
    first = normalize_visible_text(lines[0])
    if len(first) < 8 and len(lines) > 1:
        first = normalize_visible_text(lines[1])
    return first[:255] or keyword or "Collected trend asset"


def _tags_from_text(text: str, keyword: str) -> list[str]:
    tags = []
    if keyword:
        tags.append(keyword)
    for tag in HASHTAG_RE.findall(text):
        normalized = tag.strip("#＃ ")
        if normalized and normalized not in tags:
            tags.append(normalized)
    return tags[:12]


def extract_candidate_assets(
    raw_items: list[dict[str, Any]],
    platform: str,
    keyword: str,
    max_items: int,
    content_kind: str = "image_text",
) -> list[CollectedTrendAsset]:
    assets: list[CollectedTrendAsset] = []
    seen: set[str] = set()
    normalized_keyword = keyword.strip().lower()

    for raw_item in raw_items:
        text = normalize_visible_text(raw_item.get("text"))
        if len(text) < 30:
            continue
        if normalized_keyword and normalized_keyword not in text.lower() and len(text) < 80:
            continue

        url = normalize_visible_text(raw_item.get("url")) or None
        marker_source = f"{text} {url or ''}".lower()
        if any(marker in marker_source for marker in BLOCKED_MARKERS):
            continue
        if content_kind == "image_text" and any(
            marker in marker_source for marker in VIDEO_MARKERS
        ):
            continue
        key = url or text[:140]
        if key in seen:
            continue
        seen.add(key)

        assets.append(
            CollectedTrendAsset(
                platform=platform,
                title=_title_from_text(str(raw_item.get("text") or text), keyword),
                content=text[:3000],
                url=url,
                tags=_tags_from_text(text, keyword),
            )
        )
        if len(assets) >= max_items:
            break

    return assets


def _raw_visible_items_script() -> str:
    return """
() => {
  const nodes = Array.from(document.querySelectorAll('article, section, a, div')).slice(0, 900);
  const items = [];
  for (const node of nodes) {
    const text = (node.innerText || node.textContent || '').trim();
    if (!text || text.length < 30) continue;
    const linkNode = node.tagName === 'A' ? node : node.querySelector('a[href]');
    const url = linkNode ? linkNode.href : location.href;
    items.push({ text, url });
    if (items.length >= 220) break;
  }
  return items;
}
""".strip()


def _session_dir(job: TrendCollectionJob) -> Path:
    profile = job.safety_profile or {}
    label = str(profile.get("session_label") or f"{job.platform}-{job.keyword}")
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-")[:80]
    return BROWSER_SESSION_ROOT / (safe_label or f"job-{job.id}")


def _target_url(job: TrendCollectionJob) -> str:
    profile = job.safety_profile or {}
    target = profile.get("target")
    if isinstance(target, dict) and target.get("search_url"):
        return str(target["search_url"])
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Trend collection job does not include a search target.",
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


def _store_assets(
    db: Session,
    job: TrendCollectionJob,
    assets: list[CollectedTrendAsset],
) -> list[TrendContent]:
    stored: list[TrendContent] = []
    for asset in assets:
        item = TrendContent(
            platform=asset.platform,
            title=asset.title,
            content=asset.content,
            author=None,
            url=asset.url,
            tags=asset.tags,
            likes=0,
            favorites=0,
            comments=0,
            shares=0,
            video_transcript=None,
            screenshot_url=None,
        )
        db.add(item)
        stored.append(item)

    job.status = "completed" if stored else "needs_operator_review"
    job.result_summary = {
        "message": (
            "Collected public visible items from the operator-assisted browser session."
            if stored
            else "No collected public image-text items were found. Complete login/captcha only if public results are blocked, then retry."
        ),
        "collected_items": len(stored),
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
    operator_wait_seconds: int = 0,
    max_scrolls: int = 6,
) -> list[TrendContent]:
    job = db.get(TrendCollectionJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trend collection job was not found.",
        )

    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Playwright collector dependency is not installed.",
        ) from exc

    target_url = _target_url(job)
    max_items = _safe_max_items(job)
    content_kind = _content_kind(job)
    min_delay, max_delay = _delay_window(job)
    session_dir = _session_dir(job)
    session_dir.mkdir(parents=True, exist_ok=True)

    job.status = "running"
    job.result_summary = {
        "message": "Visible browser collection started.",
        "target_url": target_url,
        "content_kind": content_kind,
        "collected_items": 0,
    }
    job.error = None
    db.commit()
    db.refresh(job)

    raw_items: list[dict[str, Any]] = []
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
            if operator_wait_seconds > 0:
                page.wait_for_timeout(operator_wait_seconds * 1000)

            for _ in range(max(1, max_scrolls)):
                raw_items.extend(page.evaluate(_raw_visible_items_script()))
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

            context.close()
    except PlaywrightTimeoutError as exc:
        job.status = "needs_operator_review"
        job.error = "Visible browser timed out while loading the platform page."
        job.result_summary = {
            "message": "Retry public search first; complete login/captcha only if public results are blocked.",
            "target_url": target_url,
            "collected_items": 0,
        }
        db.commit()
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=job.error) from exc
    except Exception as exc:
        job.status = "failed"
        job.error = "Visible browser collection failed. Check local browser setup and session state."
        job.result_summary = {
            "message": job.error,
            "target_url": target_url,
            "collected_items": 0,
        }
        db.commit()
        raise

    assets = extract_candidate_assets(
        raw_items,
        job.platform,
        job.keyword,
        max_items,
        content_kind=content_kind,
    )
    return _store_assets(db=db, job=job, assets=assets)
