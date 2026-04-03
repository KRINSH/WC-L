from sqlalchemy.orm import DeclarativeBase


# Every SQLAlchemy model in the project inherits from this base class.
class Base(DeclarativeBase):
    pass

