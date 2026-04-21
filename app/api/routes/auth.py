from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.models.user import User
from app.db.session import get_db
from app.schemas.auth import (
    MessageResponse,
    PasswordChange,
    PasswordResetConfirm,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserLogin,
    UserRead,
    UserSelfUpdate,
)
from app.services.auth import (
    AuthError,
    authenticate_user,
    build_access_token_for_user,
    change_user_password,
    confirm_password_reset,
    create_user,
    request_password_reset,
    update_self_profile,
)

# Group all authentication-related endpoints under `/auth`.
router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_read(user: User) -> UserRead:
    return UserRead.model_validate(user)


# Register a new user and return the public user profile.
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    try:
        user = create_user(db, data)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_user_read(user)


# Validate credentials and return a bearer token.
@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, data.login, data.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(access_token=build_access_token_for_user(user))


# Return the currently authenticated user resolved from the bearer token.
@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return _to_user_read(current_user)


@router.post("/password-reset/request", response_model=MessageResponse)
def password_reset_request(data: PasswordResetRequest, db: Session = Depends(get_db)) -> MessageResponse:
    # Never reveal whether the email exists; always return the same message.
    request_password_reset(db, str(data.email))
    return MessageResponse(message="If this email exists, reset instructions have been sent.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
def password_reset_confirm(data: PasswordResetConfirm, db: Session = Depends(get_db)) -> MessageResponse:
    try:
        confirm_password_reset(db, data.token, data.new_password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password has been reset.")


# Update the authenticated user's username (display / login name).
@router.patch("/me", response_model=UserRead)
def patch_me(
    data: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    try:
        user = update_self_profile(db, current_user, data)
        return _to_user_read(user)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# Update password for the authenticated user (e.g. profile / admin self-service).
@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        change_user_password(db, current_user, data.current_password, data.new_password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
