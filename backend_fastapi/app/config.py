import os

class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./backend_fastapi/test.db")
    secret_key: str = os.getenv("SECRET_KEY", "secret-change-me")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

settings = Settings()
