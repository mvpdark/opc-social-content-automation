from app.core.config import settings
from app.services.model_router import model_router


def test_embedding_model_is_deterministic() -> None:
    first = model_router.embedding_model("硕升博 内容 自动化")
    second = model_router.embedding_model("硕升博 内容 自动化")

    assert first == second
    assert len(first) == settings.embedding_dimensions


def test_embedding_model_handles_empty_text() -> None:
    vector = model_router.embedding_model("")

    assert len(vector) == settings.embedding_dimensions
    assert set(vector) == {0.0}
