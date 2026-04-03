from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import cast

from app.models.user import User


# Keep admin business logic out of the HTTP router.
def list_users(db: Session, is_admin: bool | None = None) -> list[User]:
    query = select(User)
    if is_admin is not None:
        query = query.where(User.is_admin == is_admin)
    return list(db.scalars(query.order_by(User.id)).all())


def get_user(db: Session, user_id: int) -> User | None:
    return cast(User | None, db.scalar(select(User).where(User.id == user_id)))


def update_user_ban(db: Session, user_id: int, is_banned: bool) -> User | None:
    user = cast(User | None, db.scalar(select(User).where(User.id == user_id)))
    if user is None:
        return None

    user.is_banned = is_banned
    db.commit()
    db.refresh(user)
    return user


def update_user_admin_access(db: Session, user_id: int, is_admin: bool) -> User | None:
    user = cast(User | None, db.scalar(select(User).where(User.id == user_id)))
    if user is None:
        return None

    user.is_admin = is_admin
    db.commit()
    db.refresh(user)
    return user


