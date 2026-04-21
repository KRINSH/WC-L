"""Import models here so SQLAlchemy registers every table on startup."""

from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
