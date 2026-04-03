from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Human-readable name of the FastAPI app shown in docs and metadata.
    app_name: str = "WC-L"
    # Development mode flag; keeps local behavior more flexible.
    debug: bool = True
    # SQLite database path; can be overridden in `.env` for another environment.
    database_url: str = "sqlite:///./app.db"
    # Prefix used for all versioned API routes.
    api_v1_prefix: str = "/api/v1"
    # Default username for admin bootstrap scripts/tests; runtime access uses User.is_admin.
    admin_username: str = "admin"
    # Secret used to sign JWT tokens; replace in production.
    secret_key: str = "change-me-in-production"
    # JWT algorithm used for token signing and verification.
    algorithm: str = "HS256"
    # Lifetime of access tokens in minutes.
    access_token_expire_minutes: int = 60

    # Tell Pydantic Settings where to read environment overrides from.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    # Cache the settings object so the app does not re-read env vars repeatedly.
    return Settings()


