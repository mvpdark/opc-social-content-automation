from app.schemas.workspace import ExportItem
from app.services.workspace_service import _render_markdown, _render_plain


def test_render_markdown_export_payload() -> None:
    item = ExportItem(
        id=1,
        platform="xiaohongshu",
        title="硕升博申请节奏",
        body="先确认方向，再准备材料。",
        tags=["申请", "规划"],
    )

    payload = _render_markdown([item])

    assert "# 硕升博申请节奏" in payload
    assert "Platform: xiaohongshu" in payload
    assert "#申请 #规划" in payload


def test_render_plain_export_payload() -> None:
    item = ExportItem(
        id=1,
        platform="douyin",
        title="导师沟通",
        body="表达研究兴趣，不要泛泛而谈。",
        tags=[],
    )

    payload = _render_plain([item])

    assert payload == "导师沟通\n表达研究兴趣，不要泛泛而谈。"
