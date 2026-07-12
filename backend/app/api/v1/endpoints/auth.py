import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    MobileLoginRequest,
    MobileLoginResponse,
    Token,
    UserCreate,
    UserRead,
)
from app.services.auth_service import (
    authenticate_mobile_account,
    authenticate_user,
    create_user,
    issue_token,
    mobile_account_key_profile,
)
from app.models.user import User
from app.services.workspace_service import provider_status_items

router = APIRouter()
logger = logging.getLogger(__name__)


def _safe_issue_token(user: User) -> str:
    """Issue JWT token with error handling to avoid opaque 500 responses."""
    try:
        return issue_token(user)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to issue JWT token for user id=%s", getattr(user, "id", "?"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="令牌签发失败，请稍后重试。"
        )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    user = create_user(db, payload)
    return Token(access_token=_safe_issue_token(user), user=UserRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, payload.phone, payload.password)
    return Token(access_token=_safe_issue_token(user), user=UserRead.model_validate(user))


@router.post("/mobile-login", response_model=MobileLoginResponse)
def mobile_login(payload: MobileLoginRequest, db: Session = Depends(get_db)) -> MobileLoginResponse:
    user = authenticate_mobile_account(db, payload.account, payload.password)
    token = _safe_issue_token(user)
    account = user.phone
    provider_statuses = provider_status_items()
    return MobileLoginResponse(
        account=account,
        access_token=token,
        default_keys_bound=all(item.configured for item in provider_statuses),
        key_profile=mobile_account_key_profile(account),
        provider_statuses=provider_statuses,
    )
