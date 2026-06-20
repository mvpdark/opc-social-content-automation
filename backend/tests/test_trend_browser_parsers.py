"""trend_browser_parsers 模块单元测试。

覆盖小红书趋势素材解析逻辑:文本规范化、标题提取、标签解析、
指标计数、作者清洗、封面 URL 清洗、发布时间解析、紧凑元数据提取、
URL 识别、搜索聚合检测、关键词相关性、候选资产提取、详情合并。
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

from app.services.trend_browser_parsers import (
    CollectedTrendAsset,
    _blocked_candidate_count,
    _clean_author,
    _clean_cover_url,
    _clean_detail_content,
    _compact_xhs_metadata,
    _enrich_assets_from_detail_pages,
    _is_xhs_profile_url,
    _keyword_relevance_terms,
    _looks_like_search_aggregate,
    _matches_keyword_terms,
    _merge_detail_asset,
    _metric_count,
    _metric_from_raw,
    _parse_xhs_publish_time,
    _split_repeated_compact_title,
    _tags_from_text,
    _title_from_text,
    _xhs_note_id_from_url,
    extract_candidate_assets,
    normalize_visible_text,
)


class TestNormalizeVisibleText:
    def test_strips_whitespace(self) -> None:
        assert normalize_visible_text("  hello  ") == "hello"

    def test_collapses_multiple_spaces(self) -> None:
        assert normalize_visible_text("a   b\t\nc") == "a b c"

    def test_none_returns_empty(self) -> None:
        assert normalize_visible_text(None) == ""

    def test_non_string_converted(self) -> None:
        assert normalize_visible_text(123) == "123"


class TestSplitRepeatedCompactTitle:
    def test_repeated_title_split(self) -> None:
        result = _split_repeated_compact_title("博士申请 博士申请 补充内容")
        assert result is not None
        assert result[0] == "博士申请"

    def test_no_repetition_returns_none(self) -> None:
        assert _split_repeated_compact_title("普通标题无重复") is None

    def test_empty_returns_none(self) -> None:
        assert _split_repeated_compact_title("") is None


class TestTitleFromText:
    def test_first_line_becomes_title(self) -> None:
        assert _title_from_text("第一行标题\n第二行内容", "关键词") == "第一行标题"

    def test_short_first_line_uses_second(self) -> None:
        title = _title_from_text("ab\n这是更长的标题行", "关键词")
        assert title == "这是更长的标题行"

    def test_empty_text_returns_keyword(self) -> None:
        assert _title_from_text("", "关键词") == "关键词"

    def test_empty_text_no_keyword_returns_default(self) -> None:
        assert _title_from_text("", "") == "采集趋势素材"

    def test_title_truncated_to_255(self) -> None:
        long_title = "A" * 300
        assert len(_title_from_text(long_title, "")) == 255

    def test_date_marker_removed_from_title(self) -> None:
        title = _title_from_text("标题内容 2024-01-15 其他", "关键词")
        assert "2024-01-15" not in title


class TestTagsFromText:
    def test_keyword_added_as_first_tag(self) -> None:
        assert _tags_from_text("正文内容", "硕升博")[0] == "硕升博"

    def test_hashtags_extracted(self) -> None:
        tags = _tags_from_text("内容 #博士申请 #海外博士", "关键词")
        assert "博士申请" in tags
        assert "海外博士" in tags

    def test_duplicate_tags_removed(self) -> None:
        tags = _tags_from_text("内容 #博士 #博士", "博士")
        assert tags.count("博士") == 1

    def test_max_12_tags(self) -> None:
        text = " ".join(f"#tag{i}" for i in range(20))
        assert len(_tags_from_text(text, "")) <= 12

    def test_no_keyword_no_tags(self) -> None:
        assert _tags_from_text("普通文本无标签", "") == []


class TestMetricCount:
    def test_plain_number(self) -> None:
        assert _metric_count("1234") == 1234

    def test_wan_unit(self) -> None:
        assert _metric_count("1.5万") == 15000

    def test_w_lowercase(self) -> None:
        assert _metric_count("2.0w") == 20000

    def test_k_unit(self) -> None:
        assert _metric_count("3k") == 3000

    def test_qian_chinese(self) -> None:
        assert _metric_count("5千") == 5000

    def test_comma_separated(self) -> None:
        assert _metric_count("1,234") == 1234

    def test_empty_returns_zero(self) -> None:
        assert _metric_count("") == 0

    def test_no_number_returns_zero(self) -> None:
        assert _metric_count("无数字") == 0


class TestMetricFromRaw:
    def test_direct_int(self) -> None:
        assert _metric_from_raw({"likes": 42}, "likes") == 42

    def test_direct_float(self) -> None:
        assert _metric_from_raw({"likes": 3.9}, "likes") == 3

    def test_text_field_fallback(self) -> None:
        assert _metric_from_raw({"likesText": "1.2万"}, "likes") == 12000

    def test_missing_key_returns_zero(self) -> None:
        assert _metric_from_raw({}, "likes") == 0

    def test_negative_clamped_to_zero(self) -> None:
        assert _metric_from_raw({"likes": -5}, "likes") == 0


class TestCleanAuthor:
    def test_normal_author(self) -> None:
        assert _clean_author("学术小助手") == "学术小助手"

    def test_strips_at_symbol(self) -> None:
        assert _clean_author("@学术小助手") == "学术小助手"

    def test_strips_prefix(self) -> None:
        assert _clean_author("作者: 张三") == "张三"

    def test_too_short_returns_none(self) -> None:
        assert _clean_author("A") is None

    def test_too_long_returns_none(self) -> None:
        assert _clean_author("A" * 70) is None

    def test_date_marker_returns_none(self) -> None:
        assert _clean_author("2024-01-15") is None

    def test_noise_marker_returns_none(self) -> None:
        assert _clean_author("小红书用户") is None

    def test_empty_returns_none(self) -> None:
        assert _clean_author("") is None


class TestCleanCoverUrl:
    def test_valid_https_url(self) -> None:
        url = "https://example.com/image.jpg"
        assert _clean_cover_url(url) == url

    def test_valid_http_url(self) -> None:
        url = "http://example.com/image.jpg"
        assert _clean_cover_url(url) == url

    def test_static_path(self) -> None:
        assert _clean_cover_url("/static/img.png") == "/static/img.png"

    def test_data_uri_returns_none(self) -> None:
        assert _clean_cover_url("data:image/png;base64,abc") is None

    def test_non_url_returns_none(self) -> None:
        assert _clean_cover_url("not a url") is None

    def test_empty_returns_none(self) -> None:
        assert _clean_cover_url("") is None

    def test_truncated_to_500(self) -> None:
        long_url = "https://example.com/" + "a" * 600
        assert len(_clean_cover_url(long_url)) == 500


class TestParseXhsPublishTime:
    def test_just_now(self) -> None:
        now = datetime(2024, 6, 15, 12, 0, tzinfo=UTC)
        assert _parse_xhs_publish_time("刚刚", now) == now

    def test_yesterday(self) -> None:
        now = datetime(2024, 6, 15, tzinfo=UTC)
        assert _parse_xhs_publish_time("昨天", now) == now - timedelta(days=1)

    def test_day_before_yesterday(self) -> None:
        now = datetime(2024, 6, 15, tzinfo=UTC)
        assert _parse_xhs_publish_time("前天", now) == now - timedelta(days=2)

    def test_n_days_ago(self) -> None:
        now = datetime(2024, 6, 15, tzinfo=UTC)
        assert _parse_xhs_publish_time("3天前", now) == now - timedelta(days=3)

    def test_full_date(self) -> None:
        result = _parse_xhs_publish_time("2024-03-10")
        assert result == datetime(2024, 3, 10, tzinfo=UTC)

    def test_short_date_current_year(self) -> None:
        now = datetime(2024, 6, 15, tzinfo=UTC)
        assert _parse_xhs_publish_time("03-10", now) == datetime(2024, 3, 10, tzinfo=UTC)

    def test_short_date_previous_year(self) -> None:
        now = datetime(2024, 1, 5, tzinfo=UTC)
        assert _parse_xhs_publish_time("12-20", now) == datetime(2023, 12, 20, tzinfo=UTC)

    def test_empty_returns_none(self) -> None:
        assert _parse_xhs_publish_time("") is None

    def test_unparseable_returns_none(self) -> None:
        assert _parse_xhs_publish_time("乱七八糟") is None


class TestCompactXhsMetadata:
    def test_extracts_author_date_likes(self) -> None:
        text = "学术小助手 2024-01-15 1200"
        author, publish_time, likes = _compact_xhs_metadata(text, "标题")
        assert author == "学术小助手"
        assert publish_time == datetime(2024, 1, 15, tzinfo=UTC)
        assert likes == 1200

    def test_strips_title_prefix(self) -> None:
        title = "我的标题"
        text = f"{title} 学术小助手 2024-01-15"
        author, _, _ = _compact_xhs_metadata(text, title)
        assert author == "学术小助手"

    def test_no_match_returns_none_author(self) -> None:
        author, _, _ = _compact_xhs_metadata("无元数据信息", "标题")
        assert author is None


class TestCleanDetailContent:
    def test_valid_content_returned(self) -> None:
        content = "这是一段足够长的正文内容用于详情页展示" * 3
        assert _clean_detail_content(content, "标题", "fallback") == content[:3000]

    def test_too_short_returns_none(self) -> None:
        assert _clean_detail_content("短", "标题", "fallback") is None

    def test_equals_title_returns_none(self) -> None:
        assert _clean_detail_content("标题", "标题", "fallback") is None

    def test_generic_marker_returns_none(self) -> None:
        content = "小红书，年轻人的多元生活方式平台" + "x" * 20
        assert _clean_detail_content(content, "标题", "fallback") is None


class TestXhsNoteIdFromUrl:
    def test_explore_url(self) -> None:
        assert _xhs_note_id_from_url("https://www.xiaohongshu.com/explore/abc123") == "abc123"

    def test_discovery_url(self) -> None:
        assert _xhs_note_id_from_url("https://xiaohongshu.com/discovery/item/xyz789") == "xyz789"

    def test_non_xhs_url_returns_none(self) -> None:
        assert _xhs_note_id_from_url("https://example.com/page") is None

    def test_none_returns_none(self) -> None:
        assert _xhs_note_id_from_url(None) is None


class TestIsXhsProfileUrl:
    def test_profile_url(self) -> None:
        assert _is_xhs_profile_url("https://www.xiaohongshu.com/user/profile/123") is True

    def test_non_profile_url(self) -> None:
        assert _is_xhs_profile_url("https://www.xiaohongshu.com/explore/abc") is False

    def test_none_returns_false(self) -> None:
        assert _is_xhs_profile_url(None) is False


class TestLooksLikeSearchAggregate:
    def test_related_search_marker(self) -> None:
        assert _looks_like_search_aggregate("相关搜索内容") is True

    def test_long_text_with_many_dates(self) -> None:
        text = "内容" * 120 + " 2024-01-01 2024-01-02 2024-01-03"
        assert _looks_like_search_aggregate(text) is True

    def test_normal_text(self) -> None:
        assert _looks_like_search_aggregate("普通短文本") is False


class TestKeywordRelevanceTerms:
    def test_basic_keyword(self) -> None:
        terms = _keyword_relevance_terms("博士申请")
        assert "博士申请" in terms
        assert "博士" in terms or "申请" in terms

    def test_phd_related_expands(self) -> None:
        terms = _keyword_relevance_terms("硕升博")
        assert "申博" in terms
        assert "博士" in terms

    def test_empty_keyword(self) -> None:
        assert _keyword_relevance_terms("") == []


class TestMatchesKeywordTerms:
    def test_match_found(self) -> None:
        assert _matches_keyword_terms("博士申请攻略", ["博士"]) is True

    def test_no_match(self) -> None:
        assert _matches_keyword_terms("美食推荐", ["博士"]) is False

    def test_empty_terms_always_matches(self) -> None:
        assert _matches_keyword_terms("任意文本", []) is True


class TestExtractCandidateAssets:
    def _make_raw_item(
        self,
        text: str = "博士申请攻略分享：如何准备材料和套磁",
        url: str | None = "https://www.xiaohongshu.com/explore/abc123",
        **kwargs: object,
    ) -> dict[str, object]:
        item: dict[str, object] = {"text": text, "url": url}
        item.update(kwargs)
        return item

    def test_extracts_valid_item(self) -> None:
        items = [self._make_raw_item()]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 1
        assert assets[0].platform == "xiaohongshu"
        assert assets[0].url == "https://www.xiaohongshu.com/explore/abc123"

    def test_filters_profile_urls(self) -> None:
        items = [self._make_raw_item(url="https://www.xiaohongshu.com/user/profile/123")]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 0

    def test_filters_blocked_markers(self) -> None:
        items = [self._make_raw_item(text="登录后查看搜索结果")]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 0

    def test_filters_search_aggregate(self) -> None:
        items = [self._make_raw_item(text="相关搜索")]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 0

    def test_max_items_limit(self) -> None:
        items = [
            self._make_raw_item(text=f"博士申请攻略分享第{i}篇：详细经验", url=f"https://www.xiaohongshu.com/explore/abc{i}")
            for i in range(5)
        ]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 3)
        assert len(assets) == 3

    def test_dedup_by_note_id(self) -> None:
        url = "https://www.xiaohongshu.com/explore/abc123"
        items = [self._make_raw_item(text="博士申请攻略分享：详细经验", url=url) for _ in range(3)]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 1

    def test_keyword_relevance_filter_for_note_cards(self) -> None:
        items = [self._make_raw_item(text="美食推荐好去处分享给大家")]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert len(assets) == 0

    def test_extracts_tags(self) -> None:
        items = [self._make_raw_item(text="博士申请攻略分享 #海外博士 #申博")]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert "海外博士" in assets[0].tags
        assert "申博" in assets[0].tags

    def test_extracts_metrics(self) -> None:
        items = [self._make_raw_item(likes=1500, favorites=300)]
        assets = extract_candidate_assets(items, "xiaohongshu", "博士", 10)
        assert assets[0].likes == 1500
        assert assets[0].favorites == 300


class TestMergeDetailAsset:
    def test_merges_detail_data(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="原标题",
            content="原内容",
            url="https://www.xiaohongshu.com/explore/abc",
            tags=["博士"],
        )
        detail = {
            "title": "新标题内容 - 小红书",
            "content": "这是更详细的正文内容" * 5,
            "author": "新作者",
            "likes": 5000,
        }
        merged = _merge_detail_asset(asset, detail, "博士")
        assert merged.title == "新标题内容"
        assert merged.author == "新作者"
        assert merged.likes == 5000

    def test_blocked_detail_returns_original(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="原标题",
            content="原内容",
            url="https://www.xiaohongshu.com/explore/abc",
            tags=["博士"],
        )
        detail = {
            "title": "当前笔记暂时无法浏览",
            "content": "安全限制",
        }
        merged = _merge_detail_asset(asset, detail, "博士")
        assert merged.title == "原标题"


class TestEnrichAssetsFromDetailPages:
    def test_non_xhs_asset_passed_through(self) -> None:
        asset = CollectedTrendAsset(
            platform="douyin",
            title="标题",
            content="内容",
            url="https://douyin.com/video/123",
            tags=[],
        )
        page = MagicMock()
        result = _enrich_assets_from_detail_pages(page, [asset], "关键词")
        assert len(result) == 1
        assert result[0] == asset
        page.goto.assert_not_called()

    def test_asset_without_url_passed_through(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="标题",
            content="内容",
            url=None,
            tags=[],
        )
        page = MagicMock()
        result = _enrich_assets_from_detail_pages(page, [asset], "关键词")
        assert len(result) == 1
        page.goto.assert_not_called()

    def test_exception_returns_original_asset(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="标题",
            content="内容",
            url="https://www.xiaohongshu.com/explore/abc",
            tags=[],
        )
        page = MagicMock()
        page.goto.side_effect = Exception("navigation failed")
        result = _enrich_assets_from_detail_pages(page, [asset], "关键词")
        assert len(result) == 1
        assert result[0] == asset


class TestBlockedCandidateCount:
    def test_counts_blocked_items(self) -> None:
        items = [
            {"text": "登录后查看搜索结果", "url": ""},
            {"text": "正常内容", "url": ""},
            {"text": "手机号登录", "url": ""},
        ]
        assert _blocked_candidate_count(items) == 2

    def test_no_blocked_returns_zero(self) -> None:
        items = [{"text": "正常内容1", "url": ""}, {"text": "正常内容2", "url": ""}]
        assert _blocked_candidate_count(items) == 0

    def test_empty_list_returns_zero(self) -> None:
        assert _blocked_candidate_count([]) == 0


class TestCollectedTrendAsset:
    def test_frozen_dataclass(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="标题",
            content="内容",
            url=None,
            tags=[],
        )
        try:
            asset.title = "modified"  # type: ignore[misc]
            raise AssertionError("应该抛出 FrozenInstanceError")
        except AttributeError:
            pass

    def test_defaults(self) -> None:
        asset = CollectedTrendAsset(
            platform="xiaohongshu",
            title="标题",
            content="内容",
            url=None,
            tags=[],
        )
        assert asset.author is None
        assert asset.likes == 0
        assert asset.favorites == 0
        assert asset.comments == 0
        assert asset.shares == 0
        assert asset.cover_url is None
        assert asset.publish_time is None
