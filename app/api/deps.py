from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import cast

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

settings = get_settings()
# OAuth2PasswordBearer tells FastAPI where the login endpoint is for Swagger UI token flow.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    # This exception is reused for every invalid token case so the API response stays consistent.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT and pull the user id from the `sub` claim.
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    try:
        # Convert the id back to an integer and load the user from SQLite.
        user = cast(User | None, db.scalar(select(User).where(User.id == int(user_id))))
    except ValueError as exc:
        raise credentials_exception from exc
    if user is None:
        raise credentials_exception
    if user.is_banned:
        raise HTTPException(**{"status_code": status.HTTP_403_FORBIDDEN, "detail": "User account is banned"})
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    # Admin API access is granted by the DB-backed admin flag.
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


