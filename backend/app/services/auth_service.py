import logging
from secrets import compare_digest

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserCreate

logger = logging.getLogger(__name__)

# Precomputed dummy hash so that verify_password always performs the
# expensive PBKDF2 computation, preventing username enumeration via
# response-time differences (timing-attack mitigation).
_DUMMY_PASSWORD_HASH = hash_password("dummy-timing-equalization")

MOBILE_TEST_ACCOUNTS = ("admin", "admin1", "admin2")
MOBILE_ACCOUNT_KEY_PROFILES = {account: "default" for account in MOBILE_TEST_ACCOUNTS}
MOBILE_ACCOUNT_NICKNAMES = {
    "admin": "管理员",
    "admin1": "运营一号",
    "admin2": "运营二号",
}


def get_user_by_phone(db: Session, phone: str) -> User | None:
    return db.scalar(select(User).where(User.phone == phone))


def create_user(db: Session, payload: UserCreate) -> User:
    if get_user_by_phone(db, payload.phone):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="手机号已注册。",
        )

    # Security: self-registration must never allow role escalation.
    # Force the role to "promoter" regardless of the client-supplied value.
    user = User(
        phone=payload.phone,
        nickname=payload.nickname,
        role="promoter",
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
        try:
            db.refresh(user)
        except Exception:
            logger.warning("db.refresh failed after create_user commit", exc_info=True)
            user = db.get(User, user.id)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="账号创建成功但读取失败，请重试。",
                ) from None
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="手机号已注册。",
        )
    return user


def authenticate_user(db: Session, phone: str, password: str) -> User:
    user = get_user_by_phone(db, phone)
    # Timing-safe: always run verify_password (even when the user does not
    # exist) to prevent username enumeration via response-time differences.
    stored_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    if not verify_password(password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="手机号或密码不正确。",
        )
    if user is None:  # Edge case: password matched dummy hash but user doesn't exist — reject
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="手机号或密码不正确。",
        )
    return user


def authenticate_mobile_account(db: Session, account: str, password: str) -> User:
    """Authenticate a mobile test account, creating a real User record if needed.

    Returns a User object (not just the account string) so that JWT tokens
    can be issued with a real user_id for data isolation.
    """
    # Security: test accounts (admin/admin1/admin2) with password == account name
    # are only permitted in desktop or self-hosted (developer) environments.
    # In production/cloud deployments, reject to prevent authentication bypass.
    if (
        not settings.is_self_hosted_profile
        and settings.runtime_profile.strip().lower() != "desktop"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="测试账号登录仅在桌面或自托管环境可用。",
        )

    normalized_account = account.strip()
    authenticated = None
    for candidate in MOBILE_TEST_ACCOUNTS:
        if compare_digest(normalized_account, candidate) and compare_digest(password, candidate):
            authenticated = candidate
            break

    if authenticated is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码不正确。",
        )

    # Find or create a real User record for this test account.
    # Use the account name as the phone field (unique identifier).
    user = db.scalar(select(User).where(User.phone == authenticated))
    if user is None:
        user = User(
            phone=authenticated,
            nickname=MOBILE_ACCOUNT_NICKNAMES.get(authenticated, authenticated),
            role="planner",
            password_hash=hash_password(authenticated),
        )
        db.add(user)
        try:
            db.commit()
            try:
                db.refresh(user)
            except Exception:
                logger.warning("db.refresh failed after mobile account commit", exc_info=True)
                user = db.scalar(select(User).where(User.phone == authenticated))
                if user is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="账号创建成功但读取失败，请重试。",
                    ) from None
        except IntegrityError:
            logger.warning(
                "IntegrityError creating mobile account %s, retrying",
                authenticated,
                exc_info=True,
            )
            db.rollback()
            user = db.scalar(select(User).where(User.phone == authenticated))
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="账号创建冲突，请重试",
                ) from None
    return user


def mobile_account_key_profile(account: str) -> str:
    return MOBILE_ACCOUNT_KEY_PROFILES.get(account, "default")


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role)
