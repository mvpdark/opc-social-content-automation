import pytest
from fastapi import HTTPException

from app.models.trend_collection_job import TrendCollectionJob
from app.services.trend_browser_collector import (
    _blocked_candidate_count,
    _content_kind,
    _operator_wait_seconds,
    collection_session_dir,
    extract_candidate_assets,
    normalize_visible_text,
)


def test_normalize_visible_text_collapses_whitespace() -> None:
    assert normalize_visible_text("  硕升博\n\n申请\t规划  ") == "硕升博 申请 规划"


def test_collection_session_dir_uses_fixed_platform_profile() -> None:
    session_dir = collection_session_dir(
        platform="xiaohongshu",
        keyword="硕升博",
        session_label="xiaohongshu",
    )

    assert session_dir.name == "xiaohongshu"
    assert session_dir.parent.name == ".browser-sessions"


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


def test_extract_candidate_assets_skips_video_markers_by_default() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "硕升博申请经验 视频播放 先介绍背景，再讲研究计划。",
                "url": "https://www.xiaohongshu.com/explore/video-example",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_video_marker_from_class_name() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "硕升博申请经验 先介绍背景，再讲研究计划和导师沟通。",
                "url": "https://www.xiaohongshu.com/explore/video-example",
                "className": "video-card",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_content_kind_rejects_legacy_video_jobs() -> None:
    job = TrendCollectionJob(
        id=1,
        platform="xiaohongshu",
        keyword="硕升博",
        safety_profile={"content_kind": "video"},
    )

    with pytest.raises(HTTPException) as exc:
        _content_kind(job)

    assert exc.value.status_code == 409
    assert "视频采集暂未启用" in exc.value.detail


def test_operator_wait_seconds_defaults_and_clamps() -> None:
    legacy_job = TrendCollectionJob(
        id=1,
        platform="xiaohongshu",
        keyword="硕升博",
        safety_profile={},
    )
    long_wait_job = TrendCollectionJob(
        id=2,
        platform="xiaohongshu",
        keyword="硕升博",
        safety_profile={"operator_wait_seconds": 999},
    )

    assert _operator_wait_seconds(legacy_job) == 30
    assert _operator_wait_seconds(long_wait_job) == 180


def test_blocked_candidate_count_uses_text_url_and_class_name() -> None:
    raw_items = [
        {
            "text": "登录后查看搜索结果 手机号登录 获取验证码 用户协议 隐私政策",
            "url": "https://www.xiaohongshu.com/search_result?keyword=test",
            "className": "login-container",
        },
        {
            "text": "硕升博申请图文笔记 先确认研究方向，再准备套磁材料和研究计划。",
            "url": "https://www.xiaohongshu.com/explore/public-note",
            "className": "note-card",
        },
        {
            "text": "公开页面底部说明",
            "url": "https://beian.cac.gov.cn/api/static/fileUpload/example.pdf",
            "className": "footer",
        },
    ]

    assert _blocked_candidate_count(raw_items) == 2


def test_extract_candidate_assets_does_not_skip_douyin_domain_by_default() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "博士申请图文经验 先确认研究方向，再整理套磁材料和研究计划。",
                "url": "https://www.douyin.com/search/%E5%8D%9A%E5%A3%AB%E7%94%B3%E8%AF%B7",
            }
        ],
        platform="douyin",
        keyword="博士申请",
        max_items=5,
    )

    assert len(assets) == 1


def test_extract_candidate_assets_accepts_compact_xhs_note_card() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "山大硕博连读申请要求 水水学姐 03-31 165",
                "url": "https://www.xiaohongshu.com/search_result/69cbec84000000001e00d70a?xsec_token=test",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert len(assets) == 1
    assert assets[0].url is not None
    assert assets[0].title == "山大硕博连读申请要求 水水学姐"
    assert assets[0].tags == ["硕升博"]


def test_extract_candidate_assets_keeps_short_meaningful_xhs_title() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "申博成功！\nZizui\n01-08\n685",
                "url": "https://www.xiaohongshu.com/explore/695fcb8f000000000d0090e2",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert len(assets) == 1
    assert assets[0].title == "申博成功！"


def test_extract_candidate_assets_skips_xhs_search_aggregate_text() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": (
                    "没背景的看过来！ 小红薯 2025-10-28 4 "
                    "求个靠谱的申博中介 04-30 30 相关搜索 硕升博是哪个学校 "
                    "上硕上博教育 专硕可以读博吗 博加硕"
                ),
                "url": "https://www.xiaohongshu.com/explore/690075a60000000007016666",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_xhs_profile_links() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "博士申请助手 2025-12-22 125",
                "url": "https://www.xiaohongshu.com/user/profile/6508119b00000000120061c6",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_unrelated_compact_xhs_note_card() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "温州女生备婚清单 余鲜活 04-24 168",
                "url": "https://www.xiaohongshu.com/explore/68a70753000000001d00d6f0",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_login_wall_text() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "登录后查看搜索结果 可用 小红书 或 微信 扫码 手机号登录 获取验证码 用户协议 隐私政策",
                "url": "https://agree.xiaohongshu.com/h5/terms/ZXXY20220331001/-1",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_legal_footer_text() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "沪ICP备13030189号 营业执照 增值电信业务经营许可证 医疗器械网络交易服务第三方平台备案 违法不良信息举报电话 行吟信息科技",
                "url": "https://fe-video-qc.xhscdn.com/fe-platform/example.pdf",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_algorithm_filing_pdf() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "个性化推荐算法 网信算备310101216601302230019号",
                "url": "https://beian.cac.gov.cn/api/static/fileUpload/example.pdf",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []


def test_extract_candidate_assets_skips_browser_warning_text() -> None:
    assets = extract_candidate_assets(
        raw_items=[
            {
                "text": "温馨提示 您的浏览器似乎开启了广告屏蔽插件，可能对正常使用造成影响，请移除插件或将小红书加入插件白名单后继续使用。",
                "url": "https://www.xiaohongshu.com/search_result?keyword=test",
            }
        ],
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=5,
    )

    assert assets == []
