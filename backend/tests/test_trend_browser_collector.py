from app.services.trend_browser_collector import (
    extract_candidate_assets,
    normalize_visible_text,
)


def test_normalize_visible_text_collapses_whitespace() -> None:
    assert normalize_visible_text("  硕升博\n\n申请\t规划  ") == "硕升博 申请 规划"


def test_extract_candidate_assets_uses_visible_text_and_deduplicates() -> None:
    raw_items = [
        {
            "text": "硕升博申请时间线 #申请\n先确认方向，再准备导师沟通和研究计划。",
            "url": "https://www.xiaohongshu.com/search_result/example",
        },
        {
            "text": "硕升博申请时间线 #申请\n先确认方向，再准备导师沟通和研究计划。",
            "url": "https://www.xiaohongshu.com/search_result/example",
        },
        {"text": "too short", "url": "https://example.test/skip"},
    ]

    assets = extract_candidate_assets(
        raw_items=raw_items,
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=10,
    )

    assert len(assets) == 1
    assert assets[0].title == "硕升博申请时间线 #申请"
    assert assets[0].url == "https://www.xiaohongshu.com/search_result/example"
    assert assets[0].tags == ["硕升博", "申请"]


def test_extract_candidate_assets_returns_empty_without_public_items() -> None:
    assets = extract_candidate_assets(
        raw_items=[{"text": "登录后查看", "url": "https://www.douyin.com/search/test"}],
        platform="douyin",
        keyword="博士申请",
        max_items=5,
    )

    assert assets == []
