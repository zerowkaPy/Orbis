import logging
import sys
from pathlib import Path

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

def setup_logging():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8"
    )
    GEMINI_API_KEY: str = Field()
    POSTGRES_URL: PostgresDsn = Field()
    POSTGRES_PASSWORD: str = Field()

settings = Settings() # type: ignore