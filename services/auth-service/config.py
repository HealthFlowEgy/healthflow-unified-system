"""
Authentication Service Configuration
HealthFlow Digital Prescription System
"""
import os
from typing import Optional
from pydantic import BaseSettings, PostgresDsn, validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "HealthFlow Auth Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "4001"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://healthflow:password@postgres:5432/healthflow_auth"
    )
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    
    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET", "change-me-in-production-please")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRY_MINUTES", "1440"))  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_DAYS", "7"))
    
    # Password Security
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    BCRYPT_ROUNDS: int = 12
    
    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30
    SESSION_TIMEOUT_MINUTES: int = 60
    
    # Email (for password reset, etc.)
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@healthflow.eg")
    
    # Redis (for sessions, rate limiting)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    REDIS_SESSION_PREFIX: str = "session:"
    REDIS_RATE_LIMIT_PREFIX: str = "ratelimit:"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # CORS
    CORS_ORIGINS: list = [
        "https://patient.healthflow.eg",
        "https://doctor.healthflow.eg",
        "https://pharmacy.healthflow.eg",
        "https://admin.healthflow.eg",
        "https://api.healthflow.eg",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "json"  # or "text"
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE", "/app/logs/auth-service.log")
    
    # OAuth2 / SSO (optional)
    OAUTH_ENABLED: bool = os.getenv("OAUTH_ENABLED", "false").lower() == "true"
    OAUTH_PROVIDERS: list = []  # Can add Google, Microsoft, etc.
    
    # Multi-Factor Authentication
    MFA_ENABLED: bool = os.getenv("MFA_ENABLED", "false").lower() == "true"
    MFA_ISSUER_NAME: str = "HealthFlow"
    
    # Audit Logging
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 365
    
    # Health Check
    HEALTH_CHECK_PATH: str = "/health"
    
    # Metrics
    METRICS_ENABLED: bool = True
    METRICS_PATH: str = "/metrics"
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create global settings instance
settings = Settings()


# Helper functions
def get_database_url() -> str:
    """Get database URL for SQLAlchemy"""
    return settings.DATABASE_URL


def get_redis_url() -> str:
    """Get Redis URL"""
    return settings.REDIS_URL


def is_production() -> bool:
    """Check if running in production"""
    return settings.ENVIRONMENT.lower() == "production"


def is_development() -> bool:
    """Check if running in development"""
    return settings.ENVIRONMENT.lower() == "development"


# Export commonly used settings
__all__ = [
    "settings",
    "get_database_url",
    "get_redis_url",
    "is_production",
    "is_development",
]
