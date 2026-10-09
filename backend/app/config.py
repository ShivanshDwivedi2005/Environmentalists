import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "EcoTrack"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ecotrack_super_secure_secret_key_2026_change_in_production")
    SIGNING_KEY: str = os.getenv("SIGNING_KEY", "ecotrack_manifest_hmac_signing_key_987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/ecotrack.db")
    
    # Storage
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    
    # AI Engine
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

