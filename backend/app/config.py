from functools import lru_cache
from pydantic_settings import BaseSettings,SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    database_url: str = "postgresql+psycopg://hooklens:hooklens@postgres:5432/hooklens"
    redis_url: str = "redis://redis:6379/0"

    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    admin_username: str = "admin"
    admin_password: str = "admin123"

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Celery / Retry
    celery_task_always_eager: bool = False
    max_retry_attempts: int = 3
    retry_countdown_seconds: str = "5,15,30"

    @property
    def is_production(self)->bool:
        return self.app_env=="production"
    
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def retry_countdowns(self) -> list[int]:
        return [int(s.strip()) for s in self.retry_countdown_seconds.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()