from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./photographer.db"

    SECRET_KEY: str = "please-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""

    WX_MCH_ID: str = ""
    WX_MCH_KEY: str = ""
    WX_MCH_CERT_PATH: str = ""
    WX_PAY_NOTIFY_URL: str = ""

    JD_OSS_ACCESS_KEY: str = ""
    JD_OSS_SECRET_KEY: str = ""
    JD_OSS_ENDPOINT: str = ""
    JD_OSS_BUCKET: str = "photographer"
    JD_OSS_REGION: str = "cn-north-1"
    JD_OSS_CDN_DOMAIN: str = ""

    DEFAULT_COMMISSION_RATE: float = 0.08
    PAY_TIMEOUT_MINUTES: int = 30
    ACCEPT_TIMEOUT_HOURS: int = 24
    AUTO_CONFIRM_DAYS: int = 7

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
