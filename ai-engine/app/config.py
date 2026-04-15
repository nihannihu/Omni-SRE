from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3-32b"
    GROQ_FALLBACK_MODEL: str = "openai/gpt-oss-120b"
    GROQ_MAX_RETRIES: int = 3
    GROQ_TEMPERATURE: float = 0.1

    # Hindsight
    HINDSIGHT_BASE_URL: str = "http://localhost:8888"
    HINDSIGHT_API_LLM_API_KEY: str = ""

    # Server
    FASTAPI_PORT: int = 8000
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
