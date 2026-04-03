from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.models.user import User
from app.db.session import get_db
from app.schemas.auth import Token, UserCreate, UserLogin, UserRead
from app.services.auth import AuthError, authenticate_user, build_access_token_for_user, create_user

# Group all authentication-related endpoints under `/auth`.
router = APIRouter(prefix="/auth", tags=["auth"])


# Register a new user and return the public user profile.
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    try:
        user = create_user(db, data)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return user


# Validate credentials and return a signed JWT access token.
@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, data.login, data.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(access_token=build_access_token_for_user(user))


# Return the currently authenticated user resolved from the bearer token.
@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return current_user


