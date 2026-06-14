from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.knowledge import (
    KnowledgeCompileRequest,
    KnowledgeCompileResponse,
    KnowledgeCompileStatus,
    KnowledgeSearchResult,
    KnowledgeUploadRequest,
)
from app.services.knowledge_service import (
    compile_knowledge_base,
    create_knowledge_item,
    is_knowledge_compilation_due,
    latest_knowledge_compilation,
    list_knowledge_items,
    search_knowledge_items,
)


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


@router.get("/list", response_model=list[KnowledgeSearchResult])
def list_knowledge(
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=50),
    category: str | None = Query(default=None, max_length=80),
) -> list[KnowledgeSearchResult]:
    return list_knowledge_items(db=db, category=category, limit=limit)


@router.get("/compiled/latest", response_model=KnowledgeSearchResult | None)
def get_latest_compiled_knowledge(
    db: Session = Depends(get_db),
) -> KnowledgeSearchResult | None:
    return latest_knowledge_compilation(db)


@router.get("/compile/status", response_model=KnowledgeCompileStatus)
def get_knowledge_compile_status(
    db: Session = Depends(get_db),
) -> KnowledgeCompileStatus:
    return KnowledgeCompileStatus(
        latest=latest_knowledge_compilation(db),
        due=is_knowledge_compilation_due(db, settings.knowledge_compile_interval_hours),
        interval_hours=settings.knowledge_compile_interval_hours,
    )


@router.post("/compile", response_model=KnowledgeCompileResponse)
def compile_knowledge(
    payload: KnowledgeCompileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeCompileResponse:
    _ = current_user
    result = compile_knowledge_base(
        db=db,
        force=payload.force,
        interval_hours=settings.knowledge_compile_interval_hours,
        source_limit=payload.source_limit,
    )
    return KnowledgeCompileResponse(
        item=result.item,
        compiled=result.compiled,
        due=result.due,
        interval_hours=result.interval_hours,
        source_count=result.source_count,
        message=result.message,
    )


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
