from secrets import compare_digest

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserCreate


MOBILE_TEST_ACCOUNTS = ("admin", "admin1", "admin2")
MOBILE_ACCOUNT_KEY_PROFILES = {account: "default" for account in MOBILE_TEST_ACCOUNTS}


def get_user_by_phone(db: Session, phone: str) -> User | None:
    return db.scalar(select(User).where(User.phone == phone))


def create_user(db: Session, payload: UserCreate) -> User:
    if get_user_by_phone(db, payload.phone):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number is already registered.",
        )

    user = User(
        phone=payload.phone,
        nickname=payload.nickname,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, phone: str, password: str) -> User:
    user = get_user_by_phone(db, phone)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password.",
        )
    return user


def authenticate_mobile_account(account: str, password: str) -> str:
    normalized_account = account.strip()
    for candidate in MOBILE_TEST_ACCOUNTS:
        if compare_digest(normalized_account, candidate) and compare_digest(password, candidate):
            return candidate

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid account or password.",
    )


def mobile_account_key_profile(account: str) -> str:
    return MOBILE_ACCOUNT_KEY_PROFILES[account]


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role)
