from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.knowledge import KnowledgeSearchResult, KnowledgeUploadRequest
from app.services.knowledge_service import create_knowledge_item, search_knowledge_items


router = APIRouter()


@router.post("/upload", response_model=KnowledgeSearchResult)
def upload_knowledge(
    payload: KnowledgeUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSearchResult:
    _ = current_user
    item = create_knowledge_item(db, payload)
    return KnowledgeSearchResult.model_validate(item)


@router.get("/search", response_model=list[KnowledgeSearchResult])
def search_knowledge(
    q: str = Query(min_length=1, max_length=255),
    db: Session = Depends(get_db),
    limit: int = Query(default=10, ge=1, le=50),
    category: str | None = Query(default=None, max_length=80),
    mode: str = Query(default="hybrid", pattern="^(hybrid|vector|keyword)$"),
) -> list[KnowledgeSearchResult]:
    return search_knowledge_items(
        db=db,
        query=q,
        category=category,
        limit=limit,
        mode=mode,
    )
