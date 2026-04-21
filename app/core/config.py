from functools import lru_cache
import secrets

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Human-readable name of the FastAPI app shown in docs and metadata.
    app_name: str = "WC-L"
    # Development mode flag; keeps local behavior more flexible.
    debug: bool = False
    # SQLite database path; can be overridden in `.env` for another environment.
    database_url: str = "sqlite:///./app.db"
    # Prefix used for all versioned API routes.
    api_v1_prefix: str = "/api/v1"
    # Browser origins that may call the API directly in local frontend development.
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:5501",
            "http://localhost:5501",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ]
    )
    # Default username for admin bootstrap scripts/tests; runtime access uses User.is_admin.
    admin_username: str = "admin"
    # Secret used to sign JWT tokens; generated automatically if not provided.
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    # JWT algorithm used for token signing and verification.
    algorithm: str = "HS256"
    # Lifetime of access tokens in minutes.
    access_token_expire_minutes: int = 60
    # Password reset token lifetime in minutes.
    password_reset_token_ttl_minutes: int = 30
    # Frontend route used for reset links, token is appended as `?token=...`.
    password_reset_url_base: str = "http://127.0.0.1:8000/reset-password"
    # Toggle actual email delivery; keep False for local dev/tests without SMTP.
    password_reset_email_enabled: bool = False
    # SMTP connection parameters used when password reset email delivery is enabled.
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@localhost"
    # SMTP transport security mode: `none` (local), `starttls` (port 587), `ssl` (port 465).
    smtp_security: str = "starttls"

    # Tell Pydantic Settings where to read environment overrides from.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        # Enforce minimum JWT secret entropy to prevent weak token signing keys.
        if len(self.secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")

        # Keep JWT algorithm constrained to safe HMAC variants used in this project.
        if self.algorithm not in {"HS256", "HS384", "HS512"}:
            raise ValueError("ALGORITHM must be one of: HS256, HS384, HS512")

        # Prevent nonsensical token lifetimes that break auth or create very long sessions.
        if self.access_token_expire_minutes <= 0 or self.access_token_expire_minutes > 60 * 24:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440")

        # Keep reset windows short enough to reduce leaked-link risk.
        if self.password_reset_token_ttl_minutes <= 0 or self.password_reset_token_ttl_minutes > 24 * 60:
            raise ValueError("PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 1 and 1440")

        # SMTP ports outside TCP range are always invalid.
        if self.smtp_port <= 0 or self.smtp_port > 65535:
            raise ValueError("SMTP_PORT must be between 1 and 65535")

        if not self.password_reset_url_base.startswith(("http://", "https://")):
            raise ValueError("PASSWORD_RESET_URL_BASE must start with http:// or https://")

        if self.smtp_security not in {"none", "starttls", "ssl"}:
            raise ValueError("SMTP_SECURITY must be one of: none, starttls, ssl")

        return self


@lru_cache
def get_settings() -> Settings:
    # Cache the settings object so the app does not re-read env vars repeatedly.
    return Settings()
