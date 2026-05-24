import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR / 'test.db'}")
    secret_key: str = os.getenv("SECRET_KEY", "secret-change-me")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

settings = Settings()
