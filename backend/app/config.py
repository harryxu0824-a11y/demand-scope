from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_builder_token: str
    ai_builder_base_url: str = "https://space.ai-builders.com/backend"

    reddit_source: str = "mock"
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "demand-scope/0.1"

    model_reframer: str = "gemini-2.5-pro"
    model_adequacy: str = "gemini-2.5-pro"
    model_query_planner: str = "gemini-3-flash-preview"
    model_signal_filter: str = "deepseek"
    model_analyzer: str = "gemini-2.5-pro"
    model_critic: str = "gpt-5"

    app_access_tokens: str = ""
    daily_quota_per_token: int = 20
    ip_daily_limit: int = 5
    max_input_chars_per_analysis: int = 40_000

    app_allowed_origins: str = "http://localhost:3000,http://localhost:3100"

    cache_dir: Path = Path("./cache")
    cache_ttl_days: int = 7

    @property
    def access_tokens(self) -> set[str]:
        return {t.strip() for t in self.app_access_tokens.split(",") if t.strip()}

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.app_allowed_origins.split(",") if o.strip()]

    @property
    def model_for(self) -> dict[str, str]:
        return {
            "reframer": self.model_reframer,
            "adequacy": self.model_adequacy,
            "query_planner": self.model_query_planner,
            "signal_filter": self.model_signal_filter,
            "analyzer": self.model_analyzer,
            "critic": self.model_critic,
        }


settings = Settings()
settings.cache_dir.mkdir(parents=True, exist_ok=True)
