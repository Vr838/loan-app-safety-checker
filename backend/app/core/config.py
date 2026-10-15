"""Application configuration module using Pydantic Settings."""

from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Loan App Safety Checker"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./loan_safety.db"
    SYNC_DATABASE_URL: str = "sqlite:///./loan_safety.db"

    # Security
    ADMIN_API_TOKEN: str = "dev-secret-admin-token-replace-in-prod"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return ["http://localhost:3000"]

    # Scraper & Collector Settings
    MAX_APPS_PER_QUERY: int = 10
    MAX_REVIEWS_PER_APP: int = 30
    REQUEST_TIMEOUT_SECONDS: float = 15.0
    MAX_RETRIES: int = 3
    REQUEST_DELAY_SECONDS: float = 1.0

    # External Evidence Adapter
    # Providers collect live public links only. Search results remain unverified
    # provenance and never receive a regulatory status by default.
    EXTERNAL_SEARCH_PROVIDER: str = "google_news"  # google_news, duckduckgo, serpapi, or disabled
    SEARCH_API_KEY: str = ""

    # Risk Scoring Ruleset Version
    RISK_ENGINE_VERSION: str = "v1.1.0"


settings = Settings()
