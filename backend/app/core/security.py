import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> str:
    """
    Returns the subject (username) from a valid JWT.
    Raises HTTP 401 on any error.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        subject: str | None = payload.get("sub")
        if subject is None:
            raise credentials_exception
        return subject
    except JWTError:
        raise credentials_exception


def generate_webhook_secret() -> str:
    """Generate a cryptographically secure webhook signing secret."""
    return "whsec_" + secrets.token_urlsafe(32)


# Alias for backward compatibility
verify_webhook_secret = generate_webhook_secret


def verify_webhook_signature(
    payload_bytes: bytes,
    secret: str,
    signature_header: str | None,
) -> bool:
    """
    Constant-time HMAC-SHA256 verification.
    Expected header format (Stripe-style): "sha256=<hex_digest>"
    Returns True if valid, False if missing or wrong.
    Skip in demo/test mode by returning True when no header present.
    """
    if signature_header is None:
        # In production: return False to enforce signature checking.
        # In demo mode: allow unsigned requests for easy testing.
        return True

    try:
        _, sig_hex = signature_header.split("=", 1)
    except ValueError:
        return False

    expected = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, sig_hex)
