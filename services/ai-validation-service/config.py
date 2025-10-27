"""
AI Validation Service Configuration
HealthFlow Digital Prescription System
"""
import os
from typing import Optional, List
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "HealthFlow AI Validation Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "4017"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://healthflow:password@postgres:5432/healthflow"
    )
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb://mongodb:27017/healthflow"
    )
    
    # Redis (for caching validation results)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/1")
    REDIS_VALIDATION_PREFIX: str = "validation:"
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # AI Model Configuration
    AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "/app/models")
    AI_MODEL_NAME: str = os.getenv("AI_MODEL_NAME", "prescription-validator-v1")
    AI_MODEL_VERSION: str = "1.0.0"
    
    # AI Agents Configuration (11 specialized agents)
    AI_AGENTS: dict = {
        "dosage_validator": {
            "enabled": True,
            "confidence_threshold": 0.85,
            "model": "dosage-check-v1"
        },
        "interaction_checker": {
            "enabled": True,
            "confidence_threshold": 0.90,
            "model": "drug-interaction-v1"
        },
        "allergy_detector": {
            "enabled": True,
            "confidence_threshold": 0.95,
            "model": "allergy-detection-v1"
        },
        "contraindication_checker": {
            "enabled": True,
            "confidence_threshold": 0.90,
            "model": "contraindication-v1"
        },
        "age_appropriateness": {
            "enabled": True,
            "confidence_threshold": 0.85,
            "model": "age-check-v1"
        },
        "pregnancy_safety": {
            "enabled": True,
            "confidence_threshold": 0.95,
            "model": "pregnancy-safety-v1"
        },
        "duplicate_detector": {
            "enabled": True,
            "confidence_threshold": 0.90,
            "model": "duplicate-check-v1"
        },
        "formulary_validator": {
            "enabled": True,
            "confidence_threshold": 0.85,
            "model": "formulary-check-v1"
        },
        "clinical_guidelines": {
            "enabled": True,
            "confidence_threshold": 0.80,
            "model": "guidelines-v1"
        },
        "cost_analyzer": {
            "enabled": True,
            "confidence_threshold": 0.75,
            "model": "cost-analysis-v1"
        },
        "regulatory_compliance": {
            "enabled": True,
            "confidence_threshold": 0.95,
            "model": "regulatory-v1"
        }
    }
    
    # Egyptian Medicine Directory Integration
    MEDICINE_DIR_API_URL: str = os.getenv(
        "MEDICINE_DIR_API_URL",
        "https://api.medicine.gov.eg"
    )
    MEDICINE_DIR_API_KEY: Optional[str] = os.getenv("MEDICINE_DIR_API_KEY")
    MEDICINE_DIR_CACHE_TTL: int = 86400  # 24 hours
    
    # Validation Rules
    MAX_MEDICATIONS_PER_PRESCRIPTION: int = 20
    MAX_VALIDATION_TIME_SECONDS: int = 30
    VALIDATION_TIMEOUT_SECONDS: int = 60
    PARALLEL_AGENTS: bool = True  # Run agents in parallel for speed
    
    # Severity Levels
    SEVERITY_LEVELS: dict = {
        "critical": 5,  # Block prescription
        "high": 4,      # Require override
        "medium": 3,    # Warning
        "low": 2,       # Info
        "info": 1       # Just log
    }
    
    # Notification Settings
    NOTIFY_CRITICAL_ISSUES: bool = True
    NOTIFY_HIGH_ISSUES: bool = True
    NOTIFICATION_WEBHOOK_URL: Optional[str] = os.getenv("NOTIFICATION_WEBHOOK_URL")
    
    # Machine Learning
    ML_ENABLED: bool = True
    ML_ONLINE_LEARNING: bool = False  # Retrain from feedback
    ML_MODEL_UPDATE_FREQUENCY: str = "weekly"
    ML_BATCH_SIZE: int = 32
    ML_USE_GPU: bool = os.getenv("ML_USE_GPU", "false").lower() == "true"
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "json"
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE", "/app/logs/ai-validation.log")
    LOG_VALIDATION_DETAILS: bool = True
    LOG_AGENT_DECISIONS: bool = True
    
    # Performance
    MAX_CONCURRENT_VALIDATIONS: int = 100
    VALIDATION_QUEUE_SIZE: int = 1000
    AGENT_TIMEOUT_SECONDS: int = 5  # Per agent timeout
    
    # CORS
    CORS_ORIGINS: list = [
        "https://doctor.healthflow.eg",
        "https://pharmacy.healthflow.eg",
        "https://admin.healthflow.eg",
        "https://api.healthflow.eg",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Health Check
    HEALTH_CHECK_PATH: str = "/health"
    HEALTH_CHECK_INTERVAL: int = 30
    
    # Metrics
    METRICS_ENABLED: bool = True
    METRICS_PATH: str = "/metrics"
    TRACK_AGENT_PERFORMANCE: bool = True
    
    # Feature Flags
    ENABLE_EXPERIMENTAL_AGENTS: bool = False
    ENABLE_FEEDBACK_LOOP: bool = True
    ENABLE_A_B_TESTING: bool = False
    
    # Egyptian Regulatory Compliance
    EGYPTIAN_REGULATORY_ENABLED: bool = True
    CONTROLLED_SUBSTANCES_CHECK: bool = True
    NARCOTIC_REPORTING: bool = True
    MINISTRY_OF_HEALTH_INTEGRATION: bool = os.getenv(
        "MOH_INTEGRATION",
        "false"
    ).lower() == "true"
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create global settings instance
settings = Settings()


# Helper functions
def get_agent_config(agent_name: str) -> dict:
    """Get configuration for a specific AI agent"""
    return settings.AI_AGENTS.get(agent_name, {})


def is_agent_enabled(agent_name: str) -> bool:
    """Check if an AI agent is enabled"""
    agent_config = get_agent_config(agent_name)
    return agent_config.get("enabled", False)


def get_severity_level(severity: str) -> int:
    """Get numeric severity level"""
    return settings.SEVERITY_LEVELS.get(severity.lower(), 1)


def is_critical_issue(severity: str) -> bool:
    """Check if issue is critical"""
    return get_severity_level(severity) >= settings.SEVERITY_LEVELS["critical"]


def should_notify(severity: str) -> bool:
    """Check if notification should be sent for this severity"""
    level = get_severity_level(severity)
    if level >= settings.SEVERITY_LEVELS["critical"]:
        return settings.NOTIFY_CRITICAL_ISSUES
    elif level >= settings.SEVERITY_LEVELS["high"]:
        return settings.NOTIFY_HIGH_ISSUES
    return False


# Export commonly used settings
__all__ = [
    "settings",
    "get_agent_config",
    "is_agent_enabled",
    "get_severity_level",
    "is_critical_issue",
    "should_notify",
]
