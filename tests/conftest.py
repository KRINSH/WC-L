import pytest
from sqlalchemy import select

# Import models so SQLAlchemy knows which tables must exist for the tests.
import app.models  # noqa: F401 - ensure model registration
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.user import User

settings = get_settings()


# Rebuild the SQLite schema once for the whole test session.
@pytest.fixture(scope="session", autouse=True)
def initialize_database() -> None:
    # Tests should always run against a clean schema so results stay predictable.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed a known admin account so admin-only endpoints can be exercised in tests.
    with SessionLocal() as db:
        admin_exists = db.scalar(select(User).where(User.username == settings.admin_username))
        if admin_exists is None:
            db.add(
                User(
                    username=settings.admin_username,
                    email="admin@example.com",
                    password_hash=hash_password("AdminPass123"),
                    is_admin=True,
                    is_banned=False,
                )
            )
            db.commit()
        elif not admin_exists.is_admin:
            admin_exists.is_admin = True
            admin_exists.is_banned = False
            db.commit()

