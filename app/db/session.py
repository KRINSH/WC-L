from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# SQLite needs `check_same_thread=False` when FastAPI and SQLAlchemy share connections across worker threads.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    future=True,
)

# SessionLocal is the factory that creates short-lived DB sessions per request.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    # Yield one session to the request handler, then always close it afterwards.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

