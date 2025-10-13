"""
User model with authentication support
"""
from datetime import datetime
from models.database import db


class User(db.Model):
    """User model with authentication and RBAC support"""
    
    __tablename__ = 'users'
    
    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200))
    
    # Authentication fields
    password_hash = db.Column(db.String(255))
    
    # Authorization fields
    role = db.Column(db.String(50), default='pharmacist', nullable=False)
    # Roles: admin, pharmacist, doctor, auditor
    
    # Status fields
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'

    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
        
        if include_sensitive:
            data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None
            data['created_by'] = self.created_by
            data['updated_by'] = self.updated_by
        
        return data
    
    def set_password(self, password):
        """Set password hash using AuthService"""
        from services.auth_service import AuthService
        self.password_hash = AuthService.hash_password(password)
    
    def check_password(self, password):
        """Verify password using AuthService"""
        if not self.password_hash:
            return False
        from services.auth_service import AuthService
        return AuthService.verify_password(password, self.password_hash)
    
    def has_role(self, *roles):
        """Check if user has one of the specified roles"""
        return self.role in roles
    
    def is_admin(self):
        """Check if user is an admin"""
        return self.role == 'admin'
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
        db.session.commit()
