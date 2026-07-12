try:
    from datetime import UTC, datetime, timedelta
except ImportError:
    from datetime import datetime, timedelta, timezone
    UTC = timezone.utc
import hashlib
import hmac
import os

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

# Legacy salt for backward compatibility with old password hashes.
_LEGACY_SALT = b"opc_salt_v1"


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with per-password random salt.

    Format: ``pbkdf2$<salt_hex>$<hash_hex>``
    """
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a pbkdf2 hash.

    Supports both new format ``pbkdf2$<salt_hex>$<hash_hex>`` and
    legacy format ``pbkdf2$<hash_hex>`` (with hardcoded salt).
    """
    if not password_hash or not password_hash.startswith("pbkdf2$"):
        return False
    parts = password_hash[7:].split("$")
    try:
        if len(parts) == 2:
            # New format: salt$hash
            salt = bytes.fromhex(parts[0])
            stored_hash = parts[1]
        elif len(parts) == 1:
            # Legacy format: hash (hardcoded salt)
            salt = _LEGACY_SALT
            stored_hash = parts[0]
        else:
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(dk.hex(), stored_hash)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "role": role, "iat": now, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已失效，请重新登录。",
        ) from exc

    subject = payload.get("sub")
    role = payload.get("role")
    if not isinstance(subject, str) or not isinstance(role, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态异常，请重新登录。",
        )
    return {"sub": subject, "role": role}
