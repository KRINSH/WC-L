from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

# Passlib handles secure password hashing and verification for us.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    # Always store only the hash, never the plain password.
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    # Compare a plain password to the stored hash in a timing-safe way.
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    # Put the user id into `sub` and add an expiration so tokens do not live forever.
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

