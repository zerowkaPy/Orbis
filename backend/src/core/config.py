import logging
import sys

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


def setup_logging():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8"
    )
    GEMINI_API_KEY: str = Field()
    POSTGRES_URL: PostgresDsn = Field()
    POSTGRES_URL_FOR_ALEMBIC: PostgresDsn = Field()
    POSTGRES_PASSWORD: str = Field()

settings = Settings() # type: ignore