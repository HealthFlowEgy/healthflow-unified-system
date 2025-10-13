"""
Enhanced User Model with Production-Ready Features
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
import enum

db = SQLAlchemy()


class UserRole(enum.Enum):
    """User role enumeration"""
    ADMIN = 'admin'
    PHARMACIST = 'pharmacist'
    DOCTOR = 'doctor'
    PATIENT = 'patient'
    AUDITOR = 'auditor'


class User(db.Model):
    """
    Enhanced User Model with Authentication Support
    
    Features:
    - Password hashing support
    - Role-based access control
    - Activity tracking
    - Audit fields
    """
    
    __tablename__ = 'users'
    
    # Primary fields
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    
    # Authentication fields (NEW)
    password_hash = Column(String(255), nullable=True)
    
    # Profile fields (NEW)
    name = Column(String(200), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Authorization fields (NEW)
    role = Column(String(20), nullable=False, default='patient')
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Audit fields (NEW)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), 
                       onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, nullable=True)
    
    # Metadata (NEW)
    login_count = Column(Integer, default=0, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f'<User {self.username} ({self.email})>'
    
    def set_password(self, password: str) -> None:
        """Set hashed password"""
        from services.auth_service import AuthService
        self.password_hash = AuthService.hash_password(password)
    
    def check_password(self, password: str) -> bool:
        """Verify password"""
        from services.auth_service import AuthService
        if not self.password_hash:
            return False
        return AuthService.verify_password(password, self.password_hash)
    
    def update_last_login(self) -> None:
        """Update last login timestamp"""
        self.last_login = datetime.now(timezone.utc)
        self.login_count += 1
        self.failed_login_attempts = 0
    
    def update_last_activity(self) -> None:
        """Update last activity timestamp"""
        self.last_activity = datetime.now(timezone.utc)
    
    def increment_failed_login(self) -> None:
        """Increment failed login attempts"""
        self.failed_login_attempts += 1
    
    def has_role(self, role: str) -> bool:
        """Check if user has specific role"""
        return self.role == role
    
    def has_any_role(self, *roles: str) -> bool:
        """Check if user has any of the specified roles"""
        return self.role in roles
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """
        Serialize user to dictionary
        
        Args:
            include_sensitive: Include sensitive fields (default: False)
        """
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'name': self.name or f"{self.first_name} {self.last_name}".strip(),
            'role': self.role,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            data.update({
                'phone': self.phone,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None,
                'last_activity': self.last_activity.isoformat() if self.last_activity else None,
                'login_count': self.login_count,
                'failed_login_attempts': self.failed_login_attempts
            })
        
        return data
    
    @classmethod
    def find_by_email(cls, email: str):
        """Find user by email"""
        return cls.query.filter_by(email=email).first()
    
    @classmethod
    def find_by_username(cls, username: str):
        """Find user by username"""
        return cls.query.filter_by(username=username).first()
    
    @classmethod
    def find_by_id(cls, user_id: int):
        """Find user by ID"""
        return cls.query.get(user_id)
