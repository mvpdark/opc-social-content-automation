from fastapi import APIRouter, Depends, status
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
)
from app.services.workspace_service import provider_status_items


router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    user = create_user(db, payload)
    return Token(access_token=issue_token(user), user=UserRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, payload.phone, payload.password)
    return Token(access_token=issue_token(user), user=UserRead.model_validate(user))


@router.post("/mobile-login", response_model=MobileLoginResponse)
def mobile_login(payload: MobileLoginRequest) -> MobileLoginResponse:
    account = authenticate_mobile_account(payload.account, payload.password)
    return MobileLoginResponse(
        account=account,
        key_profile="default",
        provider_statuses=provider_status_items(),
    )
