from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import UserAdminAccessUpdate, UserBanUpdate
from app.schemas.auth import UserRead
from app.services.admin import get_user, list_users, update_user_admin_access, update_user_ban

# Admin-only endpoints live under `/admin`.
router = APIRouter(prefix="/admin", tags=["admin"])


# Return every registered user for moderation and support tasks.
@router.get("/users", response_model=list[UserRead])
def read_users(
    is_admin: bool | None = None,
    db: Session = Depends(get_db),
    current_admin_user: User = Depends(get_current_admin_user),
) -> list[UserRead]:
    _ = current_admin_user
    return list_users(db, is_admin=is_admin)


# Fetch one user by id so an admin can inspect account details.
@router.get("/users/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin_user: User = Depends(get_current_admin_user),
) -> UserRead:
    _ = current_admin_user
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# Ban or unban a user.
@router.patch("/users/{user_id}/ban", response_model=UserRead)
def change_user_ban_status(
    user_id: int,
    payload: UserBanUpdate,
    db: Session = Depends(get_db),
    current_admin_user: User = Depends(get_current_admin_user),
) -> UserRead:
    _ = current_admin_user
    user = update_user_ban(db, user_id, payload.is_banned)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# Grant or revoke admin access for a specific user.
@router.patch("/users/{user_id}/admin", response_model=UserRead)
def change_user_admin_access(
    user_id: int,
    payload: UserAdminAccessUpdate,
    db: Session = Depends(get_db),
    current_admin_user: User = Depends(get_current_admin_user),
) -> UserRead:
    _ = current_admin_user
    user = update_user_admin_access(db, user_id, payload.is_admin)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


