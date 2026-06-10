from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, Token, UserCreate, UserRead
from app.services.auth_service import authenticate_user, create_user, issue_token


router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    user = create_user(db, payload)
    return Token(access_token=issue_token(user), user=UserRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, payload.phone, payload.password)
    return Token(access_token=issue_token(user), user=UserRead.model_validate(user))
