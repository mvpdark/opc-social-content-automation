import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import smoke_public_image_text_search as smoke  # noqa: E402


def test_extract_image_text_candidates_skips_video_results() -> None:
    raw_items = [
        {
            "text": "硕升博申请图文笔记 #申请 这里是一段公开可见的图文内容，包含研究方向、导师沟通和材料准备。",
            "url": "https://www.xiaohongshu.com/explore/image-note",
            "className": "note-card",
        },
        {
            "text": "硕升博申请视频 播放 这里是一段公开视频说明。",
            "url": "https://www.xiaohongshu.com/explore/video-note",
            "className": "video-card",
        },
    ]

    items = smoke.extract_image_text_candidates(
        raw_items=raw_items,
        final_url="https://www.xiaohongshu.com/search_result?keyword=test",
        max_items=5,
    )

    assert len(items) == 1
    assert items[0]["url"] == "https://www.xiaohongshu.com/explore/image-note"


def test_extract_image_text_candidates_keeps_douyin_domain_when_not_video() -> None:
    raw_items = [
        {
            "text": "博士申请图文经验 先确认研究方向，再整理套磁材料和研究计划，适合作为公开搜索烟测样例。",
            "url": "https://www.douyin.com/search/%E5%8D%9A%E5%A3%AB%E7%94%B3%E8%AF%B7",
            "className": "note-card",
        }
    ]

    items = smoke.extract_image_text_candidates(
        raw_items=raw_items,
        final_url="https://www.douyin.com/search/test",
        max_items=5,
    )

    assert len(items) == 1


def test_run_serial_anonymous_attempts_caps_at_callers_attempt_count(
    monkeypatch,
) -> None:
    calls: list[int] = []

    def fake_collect_public_candidates(
        platform: str,
        keyword: str,
        max_items: int,
        attempt: int = 1,
    ) -> dict[str, object]:
        calls.append(attempt)
        return {
            "attempt": attempt,
            "platform": platform,
            "keyword": keyword,
            "page_title": "sample",
            "final_url": "https://www.xiaohongshu.com/search_result",
            "raw_candidates": 1,
            "image_text_count": 1 if attempt == 2 else 0,
            "image_text_candidates": [],
        }

    monkeypatch.setattr(smoke, "collect_public_candidates", fake_collect_public_candidates)

    result = smoke.run_serial_anonymous_attempts(
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=8,
        attempts=3,
    )

    assert calls == [1, 2, 3]
    assert result["status"] == "ok"
    assert result["mode"] == "serial_anonymous_no_cookie"
    assert result["total_image_text_count"] == 1
    assert result["successful_attempts"] == [2]


def test_run_serial_anonymous_attempts_marks_zero_results_for_operator_review(
    monkeypatch,
) -> None:
    def fake_collect_public_candidates(
        platform: str,
        keyword: str,
        max_items: int,
        attempt: int = 1,
    ) -> dict[str, object]:
        return {
            "attempt": attempt,
            "platform": platform,
            "keyword": keyword,
            "page_title": "login",
            "final_url": "https://www.xiaohongshu.com/search_result",
            "raw_candidates": 0,
            "image_text_count": 0,
            "image_text_candidates": [],
        }

    monkeypatch.setattr(smoke, "collect_public_candidates", fake_collect_public_candidates)

    result = smoke.run_serial_anonymous_attempts(
        platform="xiaohongshu",
        keyword="硕升博",
        max_items=8,
        attempts=2,
    )

    assert result["status"] == "needs_operator_review"
    assert result["total_image_text_count"] == 0
    assert result["successful_attempts"] == []


def test_extract_image_text_candidates_skips_login_wall_text() -> None:
    items = smoke.extract_image_text_candidates(
        raw_items=[
            {
                "text": "登录后查看搜索结果 可用 小红书 或 微信 扫码 小红书如何扫码 手机号登录 获取验证码 用户协议 隐私政策",
                "url": "https://agree.xiaohongshu.com/h5/terms/ZXXY20220331001/-1",
                "className": "login-container",
            }
        ],
        final_url="https://www.xiaohongshu.com/search_result?keyword=test",
        max_items=5,
    )

    assert items == []


def test_extract_image_text_candidates_skips_legal_footer_text() -> None:
    items = smoke.extract_image_text_candidates(
        raw_items=[
            {
                "text": "沪ICP备13030189号 营业执照 增值电信业务经营许可证 医疗器械网络交易服务第三方平台备案 违法不良信息举报电话 行吟信息科技",
                "url": "https://fe-video-qc.xhscdn.com/fe-platform/example.pdf",
                "className": "footer",
            }
        ],
        final_url="https://www.xiaohongshu.com/search_result?keyword=test",
        max_items=5,
    )

    assert items == []


def test_extract_image_text_candidates_skips_algorithm_filing_pdf() -> None:
    items = smoke.extract_image_text_candidates(
        raw_items=[
            {
                "text": "个性化推荐算法 网信算备310101216601302230019号",
                "url": "https://beian.cac.gov.cn/api/static/fileUpload/example.pdf",
                "className": "footer",
            }
        ],
        final_url="https://www.xiaohongshu.com/search_result?keyword=test",
        max_items=5,
    )

    assert items == []


def test_extract_image_text_candidates_skips_browser_warning_text() -> None:
    items = smoke.extract_image_text_candidates(
        raw_items=[
            {
                "text": "温馨提示 您的浏览器似乎开启了广告屏蔽插件，可能对正常使用造成影响，请移除插件或将小红书加入插件白名单后继续使用。",
                "url": "https://www.xiaohongshu.com/search_result?keyword=test",
                "className": "warning",
            }
        ],
        final_url="https://www.xiaohongshu.com/search_result?keyword=test",
        max_items=5,
    )

    assert items == []
