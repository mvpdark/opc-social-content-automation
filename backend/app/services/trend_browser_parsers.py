from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import Any

from app.services.trend_browser_scripts import detail_visible_item_script

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
COMPACT_XHS_METADATA_ONLY_RE = re.compile(
    r"(?P<author>.{2,60}?)\s+"
    r"(?P<date>\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|\d+\s*天前|昨天|前天|刚刚)"
    r"\s*(?P<likes>\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?)?"
    r"\s*(?:赞|点赞|藏|收藏|评|评论|转发|分享)?$"
)
VIDEO_MARKERS = ("视频", "播放", "直播", "video-card", "video_note", "shorts")
BLOCKED_MARKERS = (
    "\u5f53\u524d\u7b14\u8bb0\u6682\u65f6\u65e0\u6cd5\u6d4f\u89c8",
    "\u5b89\u5168\u9650\u5236",
    "IP\u5b58\u5728\u98ce\u9669",
    "\u8bf7\u5207\u6362\u53ef\u9760\u7f51\u7edc\u73af\u5883",
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
GENERIC_DETAIL_CONTENT_MARKERS = (
    "小红书，年轻人的多元生活方式平台",
    "标记我的生活",
    "当前笔记暂时无法浏览",
    "登录后查看",
    "安全限制",
)

BLOCKED_DETAIL_MARKERS = (
    "\u5f53\u524d\u7b14\u8bb0\u6682\u65f6\u65e0\u6cd5\u6d4f\u89c8",
    "\u5b89\u5168\u9650\u5236",
    "IP\u5b58\u5728\u98ce\u9669",
    "\u8bf7\u5207\u6362\u53ef\u9760\u7f51\u7edc\u73af\u5883",
)


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
    publish_time: datetime | None = None


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
    date_match = DATE_MARKER_RE.search(first)
    if date_match:
        before_date = first[: date_match.start()].strip()
        if " " in before_date:
            possible_title, possible_author = before_date.rsplit(" ", 1)
            if possible_title.strip() and 2 <= len(possible_author.strip()) <= 60:
                first = possible_title.strip()
    compact_metadata = COMPACT_XHS_METADATA_ONLY_RE.search(first)
    if compact_metadata and compact_metadata.start() > 0:
        first = first[: compact_metadata.start()].strip() or first
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


def _parse_xhs_publish_time(value: str, now: datetime | None = None) -> datetime | None:
    marker = normalize_visible_text(value)
    if not marker:
        return None
    current = now or datetime.now(UTC)
    if current.tzinfo is None:
        current = current.replace(tzinfo=UTC)
    if marker == "刚刚":
        return current
    if marker == "昨天":
        return current - timedelta(days=1)
    if marker == "前天":
        return current - timedelta(days=2)
    relative_match = re.fullmatch(r"(\d+)\s*天前", marker)
    if relative_match:
        return current - timedelta(days=int(relative_match.group(1)))
    full_date_match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", marker)
    if full_date_match:
        year, month, day = map(int, full_date_match.groups())
        return datetime(year, month, day, tzinfo=UTC)
    short_date_match = re.fullmatch(r"(\d{2})-(\d{2})", marker)
    if short_date_match:
        month, day = map(int, short_date_match.groups())
        inferred = datetime(current.year, month, day, tzinfo=UTC)
        if inferred > current + timedelta(days=1):
            inferred = inferred.replace(year=current.year - 1)
        return inferred
    return None


def _compact_xhs_metadata(text: str, title: str) -> tuple[str | None, datetime | None, int]:
    rest = normalize_visible_text(text)
    date_match = DATE_MARKER_RE.search(rest)
    publish_time = None
    likes_after_date = 0
    if date_match:
        before_date = rest[: date_match.start()].strip()
        after_date = rest[date_match.end() :].strip()
        publish_time = _parse_xhs_publish_time(date_match.group(0))
        likes_after_date = _metric_count(after_date)
        repeated_title = _split_repeated_compact_title(before_date)
        if repeated_title:
            return _clean_author(repeated_title[1]), publish_time, likes_after_date

    normalized_title = normalize_visible_text(title)
    for _ in range(2):
        if normalized_title and rest.startswith(normalized_title):
            rest = rest[len(normalized_title) :].strip()
    match = COMPACT_XHS_METADATA_RE.search(rest)
    if not match:
        match = COMPACT_XHS_METADATA_ONLY_RE.search(rest)
    if not match:
        return None, publish_time, likes_after_date
    return (
        _clean_author(match.group("author")),
        _parse_xhs_publish_time(match.group("date")),
        _metric_count(match.group("likes")),
    )


def _clean_detail_content(value: object, title: str, fallback_content: str) -> str | None:
    text = normalize_visible_text(value)
    if len(text) < 12:
        return None
    normalized_title = normalize_visible_text(title)
    if normalized_title and text == normalized_title:
        return None
    if any(marker in text for marker in GENERIC_DETAIL_CONTENT_MARKERS):
        return None

    tail = text
    for _ in range(2):
        if normalized_title and tail.startswith(normalized_title):
            tail = tail[len(normalized_title) :].strip()
    if not tail:
        return None
    if COMPACT_XHS_METADATA_ONLY_RE.fullmatch(tail):
        return None
    if len(text) < 120 and DATE_MARKER_RE.search(tail) and _metric_count(tail):
        return None
    if text == normalize_visible_text(fallback_content) and len(text) < 120:
        return None
    return text[:3000]


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
        compact_author, compact_publish_time, compact_likes = _compact_xhs_metadata(text, title)
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
                publish_time=compact_publish_time,
            )
        )
        if len(assets) >= max_items:
            break

    return assets


def _merge_detail_asset(
    asset: CollectedTrendAsset,
    detail: dict[str, Any],
    keyword: str,
) -> CollectedTrendAsset:
    title = normalize_visible_text(detail.get("title")).replace(" - 小红书", "")
    content = normalize_visible_text(detail.get("content"))
    detail_marker_source = f"{title} {content}".lower()
    if any(marker.lower() in detail_marker_source for marker in BLOCKED_DETAIL_MARKERS):
        return asset
    author = _clean_author(detail.get("author"))
    cover_url = _clean_cover_url(detail.get("coverUrl"))
    clean_content = _clean_detail_content(content, title or asset.title, asset.content)

    merged_text = " ".join(part for part in (title, content, asset.content) if part)
    return replace(
        asset,
        title=(title[:255] if len(title) >= 4 else asset.title),
        content=clean_content or asset.content,
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
    detail_script = detail_visible_item_script()
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
