from app.models.content import Content
from app.models.user import User
from app.schemas.content import ContentGenerateRequest, ContentRewriteRequest
from app.schemas.image import ImageGenerateRequest
from app.services.content_service import (
    build_draft_prompt_package,
    build_rewrite_prompt_package,
)
from app.services.image_service import build_image_prompt_package
from app.services.model_router import load_prompt


def test_draft_prompt_package_includes_xiaohongshu_style_reference() -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="硕升博申请第一步",
        knowledge_limit=0,
    )
    user = User(id=1, role="promoter", phone="test", password_hash="hash")

    package = build_draft_prompt_package(db=None, payload=payload, current_user=user)  # type: ignore[arg-type]

    assert "style_reference" in package.payload
    assert "Xiaohongshu Style Reference" in str(package.payload["style_reference"])


def test_draft_prompt_package_preserves_detailed_style_guidance() -> None:
    tone = (
        "偏女性可爱风，像学姐认真提醒：语气温柔、轻松、有陪伴感；"
        "每 2-3 段可以放 1 个 emoji 或颜文字，"
        "允许使用 ～、！！、？ 来制造口语节奏；"
        "可以用短括号吐槽制造表情包感；结尾用温和提醒引导咨询。"
    )
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="硕升博申请第一步",
        knowledge_limit=0,
        tone=tone,
    )
    user = User(id=1, role="promoter", phone="test", password_hash="hash")

    package = build_draft_prompt_package(db=None, payload=payload, current_user=user)  # type: ignore[arg-type]

    assert package.payload["tone"] == tone


def test_draft_prompt_package_includes_live_web_search_context(
    monkeypatch,
) -> None:
    payload = ContentGenerateRequest(
        platform="xiaohongshu",
        topic="全球水博排名必看",
        knowledge_limit=0,
        tags=["水博", "排名"],
    )
    user = User(id=1, role="promoter", phone="test", password_hash="hash")

    monkeypatch.setattr(
        "app.services.content_service.build_live_web_search_context",
        lambda **_kwargs: {
            "provider": "tavily",
            "query": "全球水博排名必看",
            "results": [
                {
                    "title": "Official water PhD source",
                    "url": "https://example.edu/water-phd",
                    "content": "Official source snippet.",
                }
            ],
        },
    )

    package = build_draft_prompt_package(db=None, payload=payload, current_user=user)  # type: ignore[arg-type]

    assert package.payload["web_search_context"] is not None
    assert "Official water PhD source" in str(package.payload["web_search_context"])


def test_draft_prompt_template_requires_xhs_expression_layer() -> None:
    prompt = load_prompt("draft_generation")
    style_reference = load_prompt("xiaohongshu_style_reference")

    assert "[笑哭R]" in prompt
    assert "表情包感" in prompt
    assert "👉💧" in prompt
    assert "📍" in prompt
    assert "🎓" in prompt
    assert "ranking/list" in prompt
    assert "structure" in prompt
    assert "全球水博排名必看" in prompt
    assert "supervisor matching" in prompt
    assert "direction-narrowing" in prompt
    assert "background-strengthening" in prompt
    assert "value/objection-handling" in prompt
    assert "方向太散" in prompt
    assert "没有论文" in prompt
    assert "含金量" in prompt
    assert "web_search_context" in prompt
    assert "Tavily" in prompt
    assert "哦" in prompt
    assert "呀" in prompt
    assert "[哭惹R]" in style_reference
    assert "结构标识" in style_reference
    assert "✅" in style_reference
    assert "姐妹" in style_reference
    assert "路线/榜单型封面" in style_reference
    assert "水博榜" in style_reference


def test_rewrite_prompt_package_includes_xiaohongshu_style_reference() -> None:
    content = Content(
        id=1,
        user_id=1,
        platform="xiaohongshu",
        title="硕升博申请第一步",
        body="先定研究方向，再考虑套磁。",
        tags=["硕升博"],
        status="draft",
    )
    payload = ContentRewriteRequest(content_id=1)
    user = User(id=1, role="promoter", phone="test", password_hash="hash")

    package = build_rewrite_prompt_package(content=content, payload=payload, current_user=user)

    assert "style_reference" in package.payload
    assert "Xiaohongshu Style Reference" in str(package.payload["style_reference"])


def test_image_prompt_package_includes_xiaohongshu_style_reference_and_visual_direction() -> None:
    content = Content(
        id=1,
        user_id=1,
        platform="xiaohongshu",
        title="硕升博申请第一步",
        body="先定研究方向，再考虑套磁。",
        tags=["硕升博"],
        status="approved",
    )
    payload = ImageGenerateRequest(content_id=1, template="xiaohongshu-cover")
    user = User(id=1, role="promoter", phone="test", password_hash="hash")

    package = build_image_prompt_package(content=content, payload=payload, current_user=user)

    assert "style_reference" in package.payload
    assert "visual_direction" in package.payload
    assert "Xiaohongshu Style Reference" in str(package.payload["style_reference"])
    assert "路线/榜单型封面" in str(package.payload["style_reference"])
    assert isinstance(package.payload["visual_direction"], dict)
    assert package.payload["visual_direction"]["instructions"]
