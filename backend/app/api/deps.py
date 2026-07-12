from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def _default_planner_user() -> User:
    """每次返回新的 User 实例，避免全局可变状态被污染。"""
    return User(
        id=0,
        phone="local-planner",
        nickname="默认运营员",
        role="planner",
        password_hash="disabled-auth",
        domain_key="ssb",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not settings.auth_required:
        return _default_planner_user()

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录。",
        )

    try:
        token_data = decode_access_token(credentials.credentials)
        sub = token_data.get("sub")
        if sub is None:
            raise ValueError("missing sub claim")
        user_id = int(sub)
    except HTTPException:
        raise
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态异常，请重新登录。",
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号不存在或已失效，请重新登录。",
        )
    return user


WRITER_ROLES = {"planner", "admin"}


def require_writer_role(
    current_user: User = Depends(get_current_user),
) -> User:
    """写操作鉴权：只有 planner 或 admin 角色才能执行。"""
    if current_user.role not in WRITER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有写入权限。",
        )
    return current_user
