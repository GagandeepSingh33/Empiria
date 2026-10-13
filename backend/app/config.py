import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql+psycopg://postgres@127.0.0.1:5433/empiria"
    )
    secret_key: str = os.getenv(
        "SECRET_KEY", "empiria-insecure-dev-secret-key-change-in-production-32bytes"
    )
    csrf_secret: str = os.getenv(
        "CSRF_SECRET", "empiria-csrf-token-secret-change-in-prod"
    )
    session_cookie_name: str = "empiria_session"
    session_expiry_hours: int = int(os.getenv("SESSION_EXPIRY_HOURS", "24"))
    storage_dir: str = os.getenv(
        "STORAGE_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage"),
    )
    environment: str = os.getenv("ENVIRONMENT", "development")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    min_cohort_default: int = 5
    min_cohort_threshold: int = 5


    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
