from __future__ import annotations

import random
import re
from dataclasses import dataclass, replace
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
XHS_NOTE_URL_RE = re.compile(
    r"https?://(?:www\.)?xiaohongshu\.com/(?:explore|discovery/item|search_result)/([a-zA-Z0-9]+)",
    re.IGNORECASE,
)
XHS_PROFILE_URL_RE = re.compile(
    r"https?://(?:www\.)?xiaohongshu\.com/user/profile/",
    re.IGNORECASE,
)
COMPACT_CARD_DATE_RE = re.compile(
    r"\s+(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)\b.*$"
)
DATE_MARKER_RE = re.compile(r"(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)")
COMPACT_XHS_METADATA_RE = re.compile(
    r"(?P<author>.{2,60}?)\s+"
    r"(?P<date>\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)"
    r"\s*(?P<likes>\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?)?$"
)
VIDEO_MARKERS = ("视频", "播放", "直播", "video-card", "video_note", "shorts")
VIDEO_COLLECTION_DISABLED_DETAIL = (
    "视频采集暂未启用；需要先补齐转写、版权和人工复核流程。"
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
RELATED_SEARCH_MARKERS = ("相关搜索",)
METRIC_NUMBER_RE = re.compile(r"(\d+(?:\.\d+)?)\s*([万wWkK千]?)")
AUTHOR_NOISE_MARKERS = (
    "赞",
    "收藏",
    "评论",
    "分享",
    "转发",
    "关注",
    "登录",
    "小红书",
)


def collection_session_dir(
    platform: str,
    keyword: str = "",
    session_label: str | None = None,
) -> Path:
    label = str(session_label or platform or f"{platform}-{keyword}")
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-")[:80]
    return BROWSER_SESSION_ROOT / (safe_label or f"{platform}-session")


@dataclass(frozen=True)
class CollectedTrendAsset:
    platform: str
    title: str
    content: str
    url: str | None
    tags: list[str]
    author: str | None = None
    likes: int = 0
    favorites: int = 0
    comments: int = 0
    shares: int = 0
    cover_url: str | None = None


def normalize_visible_text(value: object) -> str:
    return SPACE_RE.sub(" ", str(value or "")).strip()


def _split_repeated_compact_title(value: str) -> tuple[str, str] | None:
    text = normalize_visible_text(value)
    max_prefix_length = min(len(text) // 2, 140)
    for index in range(max_prefix_length, 3, -1):
        prefix = text[:index].strip()
        repeated = f"{prefix} {prefix}"
        if prefix and text.startswith(repeated):
            return prefix, text[len(repeated) :].strip()
    return None


def _title_from_text(text: str, keyword: str) -> str:
    lines = [line.strip() for line in str(text).splitlines() if line.strip()]
    if not lines:
        return keyword or "采集趋势素材"
    first = normalize_visible_text(lines[0])
    if len(first) < 4 and len(lines) > 1:
        first = normalize_visible_text(lines[1])
    first = COMPACT_CARD_DATE_RE.sub("", first).strip() or first
    repeated_title = _split_repeated_compact_title(first)
    if repeated_title:
        first = repeated_title[0]
    return first[:255] or keyword or "采集趋势素材"


def _tags_from_text(text: str, keyword: str) -> list[str]:
    tags = []
    if keyword:
        tags.append(keyword)
    for tag in HASHTAG_RE.findall(text):
        normalized = tag.strip("#＃ ")
        if normalized and normalized not in tags:
            tags.append(normalized)
    return tags[:12]


def _metric_count(value: object) -> int:
    text = normalize_visible_text(value).replace(",", "")
    if not text:
        return 0
    match = METRIC_NUMBER_RE.search(text)
    if not match:
        return 0
    number = float(match.group(1))
    unit = match.group(2).lower()
    if unit in {"万", "w"}:
        number *= 10_000
    elif unit in {"千", "k"}:
        number *= 1_000
    return max(0, int(number))


def _metric_from_raw(raw_item: dict[str, Any], key: str) -> int:
    direct = raw_item.get(key)
    if isinstance(direct, int):
        return max(0, direct)
    if isinstance(direct, float):
        return max(0, int(direct))
    return _metric_count(raw_item.get(f"{key}Text"))


def _clean_author(value: object) -> str | None:
    text = normalize_visible_text(value).strip("@：: ")
    if not text:
        return None
    text = re.sub(r"^(作者|博主|用户)\s*[:：]?\s*", "", text).strip()
    if len(text) < 2 or len(text) > 60:
        return None
    if DATE_MARKER_RE.search(text):
        return None
    if any(marker in text for marker in AUTHOR_NOISE_MARKERS):
        return None
    return text[:120]


def _clean_cover_url(value: object) -> str | None:
    text = normalize_visible_text(value)
    if not text or not text.startswith(("http://", "https://", "/static/")):
        return None
    if text.startswith("data:"):
        return None
    return text[:500]


def _compact_xhs_metadata(text: str, title: str) -> tuple[str | None, int]:
    rest = normalize_visible_text(text)
    date_match = DATE_MARKER_RE.search(rest)
    if date_match:
        before_date = rest[: date_match.start()].strip()
        after_date = rest[date_match.end() :].strip()
        repeated_title = _split_repeated_compact_title(before_date)
        if repeated_title:
            return _clean_author(repeated_title[1]), _metric_count(after_date)

    normalized_title = normalize_visible_text(title)
    for _ in range(2):
        if normalized_title and rest.startswith(normalized_title):
            rest = rest[len(normalized_title) :].strip()
    match = COMPACT_XHS_METADATA_RE.search(rest)
    if not match:
        return None, 0
    return _clean_author(match.group("author")), _metric_count(match.group("likes"))


def _xhs_note_id_from_url(url: str | None) -> str | None:
    if not url:
        return None
    match = XHS_NOTE_URL_RE.search(url)
    return match.group(1) if match else None


def _is_xhs_profile_url(url: str | None) -> bool:
    return bool(url and XHS_PROFILE_URL_RE.search(url))


def _looks_like_search_aggregate(text: str) -> bool:
    if any(marker in text for marker in RELATED_SEARCH_MARKERS):
        return True
    return len(text) > 220 and len(DATE_MARKER_RE.findall(text)) >= 3


def _keyword_relevance_terms(keyword: str) -> list[str]:
    terms: list[str] = []
    normalized = normalize_visible_text(keyword)
    if normalized:
        terms.append(normalized.lower())
    for token in re.split(r"[\s,，、/]+", normalized):
        token = token.strip().lower()
        if len(token) >= 2 and token not in terms:
            terms.append(token)
    if any(marker in normalized for marker in ("硕升博", "申博", "硕博", "读博", "博士")):
        for token in ("硕升博", "申博", "硕博", "读博", "博士", "博连读", "转博"):
            if token not in terms:
                terms.append(token)
    return terms


def _matches_keyword_terms(text: str, terms: list[str]) -> bool:
    if not terms:
        return True
    normalized_text = text.lower()
    return any(term and term in normalized_text for term in terms)


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
    keyword_terms = _keyword_relevance_terms(keyword)

    for raw_item in raw_items:
        text = normalize_visible_text(raw_item.get("text"))
        url = normalize_visible_text(raw_item.get("url")) or None
        note_id = _xhs_note_id_from_url(url)
        is_xhs_note_card = note_id is not None

        if _is_xhs_profile_url(url):
            continue
        marker_source = f"{text} {url or ''} {raw_item.get('className') or ''}".lower()
        if any(marker in marker_source for marker in BLOCKED_MARKERS):
            continue
        if _looks_like_search_aggregate(text):
            continue
        if len(text) < (10 if is_xhs_note_card else 30):
            continue
        if is_xhs_note_card and not _matches_keyword_terms(text, keyword_terms):
            continue
        if (
            not is_xhs_note_card
            and normalized_keyword
            and normalized_keyword not in text.lower()
            and len(text) < 80
        ):
            continue
        if content_kind == "image_text" and any(
            marker in marker_source for marker in VIDEO_MARKERS
        ):
            continue
        key = f"xhs:{note_id}" if note_id else url or text[:140]
        if key in seen:
            continue
        seen.add(key)

        title = _title_from_text(str(raw_item.get("text") or text), keyword)
        compact_author, compact_likes = _compact_xhs_metadata(text, title)
        assets.append(
            CollectedTrendAsset(
                platform=platform,
                title=title,
                content=text[:3000],
                url=url,
                tags=_tags_from_text(text, keyword),
                author=_clean_author(raw_item.get("author")) or compact_author,
                likes=_metric_from_raw(raw_item, "likes") or compact_likes,
                favorites=_metric_from_raw(raw_item, "favorites"),
                comments=_metric_from_raw(raw_item, "comments"),
                shares=_metric_from_raw(raw_item, "shares"),
                cover_url=_clean_cover_url(raw_item.get("coverUrl")),
            )
        )
        if len(assets) >= max_items:
            break

    return assets


def _raw_visible_items_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const firstText = (root, selectors, maxLength = 80) => {
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const metricText = (root, selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector)).slice(0, 8)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const coverUrl = (root) => {
    const images = Array.from(root.querySelectorAll('img')).map((image) => {
      const rect = image.getBoundingClientRect();
      const url = image.currentSrc || image.src || image.getAttribute('data-src') || image.getAttribute('data-original') || '';
      const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
      return { url, area: rect.width * rect.height, marker };
    }).filter((item) => {
      if (!item.url || item.url.startsWith('data:')) return false;
      if (item.area < 2500) return false;
      return !/avatar|user|icon|logo/.test(item.marker);
    }).sort((left, right) => right.area - left.area);
    return images[0]?.url || '';
  };
  const selectors = [
    'a[href*="/explore/"]',
    'a[href*="/discovery/item/"]',
    'article',
    'section',
    '[class*="note"]',
    '[class*="card"]',
    'a',
    'div'
  ];
  const nodes = [];
  const seen = new Set();
  for (const selector of selectors) {
    for (const node of Array.from(document.querySelectorAll(selector)).slice(0, 900)) {
      if (seen.has(node)) continue;
      seen.add(node);
      nodes.push(node);
      if (nodes.length >= 1200) break;
    }
    if (nodes.length >= 1200) break;
  }
  const items = [];
  for (const node of nodes) {
    const linkNode = node.tagName === 'A' ? node : node.querySelector('a[href]');
    const text = [
      node.innerText || node.textContent || '',
      node.getAttribute('aria-label') || '',
      node.getAttribute('title') || '',
      linkNode?.getAttribute('aria-label') || '',
      linkNode?.getAttribute('title') || ''
    ].join(' ').trim();
    if (!text || text.length < 20) continue;
    const url = linkNode ? linkNode.href : location.href;
    items.push({
      text,
      url,
      className: String(node.className || ''),
      author: firstText(node, [
        '[class*="author"] [class*="name"]',
        '[class*="author"]',
        'a[href*="/user/profile/"]',
        '[class*="user"] [class*="name"]',
        '[class*="nickname"]'
      ]),
      likesText: metricText(node, ['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
      favoritesText: metricText(node, [
        '[class*="collect"]',
        '[class*="favorite"]',
        '[aria-label*="藏"]',
        '[aria-label*="收藏"]',
        '[title*="藏"]',
        '[title*="收藏"]'
      ]),
      commentsText: metricText(node, ['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
      sharesText: metricText(node, [
        '[class*="share"]',
        '[aria-label*="转"]',
        '[aria-label*="分享"]',
        '[title*="转"]',
        '[title*="分享"]'
      ]),
      coverUrl: coverUrl(node)
    });
    if (items.length >= 240) break;
  }
  return items;
}
""".strip()


def _detail_visible_item_script() -> str:
    return """
() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const meta = (selector) => normalize(document.querySelector(selector)?.getAttribute('content') || '');
  const firstText = (selectors, maxLength = 160) => {
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || '');
        if (text && text.length <= maxLength) return text;
      }
    }
    return '';
  };
  const longestText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 24)) {
        const text = normalize(element.innerText || element.textContent || '');
        if (text && text.length >= 10) values.push(text);
      }
    }
    values.sort((left, right) => right.length - left.length);
    return values[0] || '';
  };
  const metricText = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
        const text = normalize([
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.innerText || element.textContent || ''
        ].join(' '));
        if (text) values.push(text);
      }
    }
    return values.join(' ');
  };
  const coverUrl = () => {
    const metaImage = meta('meta[property="og:image"]') || meta('meta[name="og:image"]');
    if (metaImage) return metaImage;
    const images = Array.from(document.querySelectorAll('img')).map((image) => {
      const rect = image.getBoundingClientRect();
      const url = image.currentSrc || image.src || image.getAttribute('data-src') || image.getAttribute('data-original') || '';
      const marker = `${image.className || ''} ${image.alt || ''}`.toLowerCase();
      return { url, area: rect.width * rect.height, marker };
    }).filter((item) => {
      if (!item.url || item.url.startsWith('data:')) return false;
      if (item.area < 2500) return false;
      return !/avatar|user|icon|logo/.test(item.marker);
    }).sort((left, right) => right.area - left.area);
    return images[0]?.url || '';
  };
  return {
    title: meta('meta[property="og:title"]') || firstText(['h1', '[class*="title"]']) || document.title,
    content: meta('meta[name="description"]') || meta('meta[property="og:description"]') || longestText([
      '[class*="desc"]',
      '[class*="content"]',
      '[class*="note"]',
      'main'
    ]),
    author: firstText([
      '[class*="author"] [class*="name"]',
      '[class*="author"]',
      'a[href*="/user/profile/"]',
      '[class*="user"] [class*="name"]',
      '[class*="nickname"]'
    ], 80),
    likesText: metricText(['[class*="like"]', '[aria-label*="赞"]', '[title*="赞"]']),
    favoritesText: metricText([
      '[class*="collect"]',
      '[class*="favorite"]',
      '[aria-label*="藏"]',
      '[aria-label*="收藏"]',
      '[title*="藏"]',
      '[title*="收藏"]'
    ]),
    commentsText: metricText(['[class*="comment"]', '[aria-label*="评"]', '[title*="评"]']),
    sharesText: metricText([
      '[class*="share"]',
      '[aria-label*="转"]',
      '[aria-label*="分享"]',
      '[title*="转"]',
      '[title*="分享"]'
    ]),
    coverUrl: coverUrl()
  };
}
""".strip()


def _merge_detail_asset(
    asset: CollectedTrendAsset,
    detail: dict[str, Any],
    keyword: str,
) -> CollectedTrendAsset:
    title = normalize_visible_text(detail.get("title")).replace(" - 小红书", "")
    content = normalize_visible_text(detail.get("content"))
    author = _clean_author(detail.get("author"))
    cover_url = _clean_cover_url(detail.get("coverUrl"))

    merged_text = " ".join(part for part in (title, content, asset.content) if part)
    return replace(
        asset,
        title=(title[:255] if len(title) >= 4 else asset.title),
        content=(content[:3000] if len(content) >= 10 else asset.content),
        tags=_tags_from_text(merged_text, keyword) or asset.tags,
        author=author or asset.author,
        likes=_metric_from_raw(detail, "likes") or asset.likes,
        favorites=_metric_from_raw(detail, "favorites") or asset.favorites,
        comments=_metric_from_raw(detail, "comments") or asset.comments,
        shares=_metric_from_raw(detail, "shares") or asset.shares,
        cover_url=cover_url or asset.cover_url,
    )


def _enrich_assets_from_detail_pages(
    page: Any,
    assets: list[CollectedTrendAsset],
    keyword: str,
) -> list[CollectedTrendAsset]:
    enriched: list[CollectedTrendAsset] = []
    detail_script = _detail_visible_item_script()
    for asset in assets:
        if not asset.url or asset.platform != "xiaohongshu":
            enriched.append(asset)
            continue
        try:
            page.goto(asset.url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(1200)
            detail = page.evaluate(detail_script) or {}
            if isinstance(detail, dict):
                enriched.append(_merge_detail_asset(asset, detail, keyword))
            else:
                enriched.append(asset)
        except Exception:
            enriched.append(asset)
    return enriched


def _blocked_candidate_count(raw_items: list[dict[str, Any]]) -> int:
    count = 0
    for raw_item in raw_items:
        text = normalize_visible_text(raw_item.get("text"))
        url = normalize_visible_text(raw_item.get("url"))
        marker_source = f"{text} {url} {raw_item.get('className') or ''}".lower()
        if any(marker in marker_source for marker in BLOCKED_MARKERS):
            count += 1
    return count


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
                evaluated_items = page.evaluate(_raw_visible_items_script()) or []
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
    except Exception as exc:
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
