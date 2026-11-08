from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="HCPP_", extra="ignore")

    app_name: str = "Healthcare Patient Portal API"
    environment: str = "development"  # development | test | production

    # PostgreSQL in Docker/production, e.g. postgresql+psycopg://user:pass@db:5432/hcpp
    # SQLite is only a zero-setup fallback for local development and tests.
    database_url: str = "sqlite:///./hcpp_dev.db"

    jwt_secret: str = "dev-only-change-me-dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 8

    cookie_name: str = "hcpp_session"
    cookie_secure: bool = False  # MUST be true in production (HTTPS)
    cors_origins: list[str] = ["http://localhost:3000"]

    # Appointments use hospital wall-clock time.
    timezone: str = "Asia/Kolkata"
    booking_horizon_days: int = 60

    upload_dir: str = "./uploads"
    max_upload_bytes: int = 5 * 1024 * 1024

    login_max_attempts: int = 5
    login_window_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.environment == "production":
        if s.jwt_secret.startswith("dev-only") or len(s.jwt_secret) < 32:
            raise RuntimeError("HCPP_JWT_SECRET must be set to a strong secret in production")
        if not s.cookie_secure:
            raise RuntimeError("HCPP_COOKIE_SECURE must be true in production")
    return s
