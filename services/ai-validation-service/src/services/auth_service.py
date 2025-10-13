"""
JWT-based authentication service for production
File: src/services/auth_service.py
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from functools import wraps
from flask import request, jsonify, current_app
from models.database import db
from models.user import User
from utils.password_validator import PasswordValidator
from utils.token_manager import get_token_manager


class AuthService:
    """JWT authentication and authorization service"""
    
    @staticmethod
    def get_secret_key() -> str:
        """Get JWT secret key from environment"""
        secret = os.environ.get('JWT_SECRET_KEY')
        if not secret:
            raise ValueError("JWT_SECRET_KEY environment variable must be set")
        return secret
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """
        Verify a password against its hash
        
        Args:
            password: Plain text password to verify
            password_hash: Stored password hash
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'),
                password_hash.encode('utf-8')
            )
        except Exception:
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        """
        Validate password strength using OWASP-compliant validator
        
        Args:
            password: Plain text password to validate
            
        Returns:
            Tuple of (is_valid, message)
        """
        result = PasswordValidator.validate_password_strength(password)
        return result.is_valid, result.message
    
    @staticmethod
    def generate_token(
        user_id: int,
        role: str,
        expires_in: int = None
    ) -> Tuple[str, datetime]:
        """
        Generate JWT access token
        
        Args:
            user_id: User ID
            role: User role
            expires_in: Token expiration in seconds (default: 1 hour)
            
        Returns:
            Tuple of (token, expiration_datetime)
        """
        if expires_in is None:
            expires_in = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
        
        expiration = datetime.utcnow() + timedelta(seconds=expires_in)
        
        payload = {
            'user_id': user_id,
            'role': role,
            'exp': expiration,
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        
        token = jwt.encode(
            payload,
            AuthService.get_secret_key(),
            algorithm='HS256'
        )
        
        return token, expiration
    
    @staticmethod
    def generate_refresh_token(user_id: int, role: str = 'user') -> Tuple[str, datetime]:
        """
        Generate JWT refresh token
        
        Args:
            user_id: User ID
            role: User role (default: 'user')
            
        Returns:
            Tuple of (token, expiration_datetime)
        """
        expires_in = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000))  # 30 days
        expiration = datetime.utcnow() + timedelta(seconds=expires_in)
        
        payload = {
            'user_id': user_id,
            'role': role,
            'exp': expiration,
            'iat': datetime.utcnow(),
            'type': 'refresh'
        }
        
        token = jwt.encode(
            payload,
            AuthService.get_secret_key(),
            algorithm='HS256'
        )
        
        return token, expiration
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """
        Decode and validate JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                AuthService.get_secret_key(),
                algorithms=['HS256']
            )
            return payload
        except jwt.ExpiredSignatureError:
            current_app.logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            current_app.logger.warning(f"Invalid token: {str(e)}")
            return None
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = User.query.filter_by(email=email).first()
        
        if not user:
            current_app.logger.warning(f"Authentication failed: User not found for {email}")
            return None
        
        if not user.is_active:
            current_app.logger.warning(f"Authentication failed: User {email} is inactive")
            return None
        
        if not user.password_hash:
            current_app.logger.warning(f"Authentication failed: No password set for {email}")
            return None
        
        if not AuthService.verify_password(password, user.password_hash):
            current_app.logger.warning(f"Authentication failed: Invalid password for {email}")
            return None
        
        return user
    
    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[Tuple[str, datetime]]:
        """
        Generate new access token from refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Tuple of (new_access_token, expiration) or None if invalid
        """
        payload = AuthService.decode_token(refresh_token)
        
        if not payload or payload.get('type') != 'refresh':
            return None
        
        user = User.query.get(payload['user_id'])
        if not user or not user.is_active:
            return None
        
        return AuthService.generate_token(user.id, user.role)


def token_required(f):
    """
    Decorator to protect routes requiring authentication
    
    Usage:
        @app.route('/protected')
        @token_required
        def protected_route(current_user):
            return jsonify({'message': 'Success'})
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({
                'status': 'error',
                'message': 'Authentication token is missing',
                'error_code': 'TOKEN_MISSING'
            }), 401
        
        # Decode and validate token
        payload = AuthService.decode_token(token)
        if not payload:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired token',
                'error_code': 'TOKEN_INVALID'
            }), 401
        
        # Verify token type
        if payload.get('type') != 'access':
            return jsonify({
                'status': 'error',
                'message': 'Invalid token type',
                'error_code': 'TOKEN_TYPE_INVALID'
            }), 401
        
        # Get current user
        current_user = User.query.get(payload['user_id'])
        if not current_user or not current_user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'User not found or inactive',
                'error_code': 'USER_INVALID'
            }), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def role_required(*allowed_roles):
    """
    Decorator to protect routes requiring specific roles
    
    Usage:
        @app.route('/admin')
        @token_required
        @role_required('admin')
        def admin_route(current_user):
            return jsonify({'message': 'Admin access'})
    """
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({
                    'status': 'error',
                    'message': 'Insufficient permissions',
                    'error_code': 'INSUFFICIENT_PERMISSIONS',
                    'required_roles': list(allowed_roles),
                    'user_role': current_user.role
                }), 403
            
            return f(current_user, *args, **kwargs)
        
        return decorated
    
    return decorator


def optional_token(f):
    """
    Decorator for routes that work with or without authentication
    Provides current_user as None if not authenticated
    
    Usage:
        @app.route('/optional')
        @optional_token
        def optional_route(current_user):
            if current_user:
                return jsonify({'message': 'Authenticated'})
            return jsonify({'message': 'Anonymous'})
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            payload = AuthService.decode_token(token)
            
            if payload and payload.get('type') == 'access':
                current_user = User.query.get(payload['user_id'])
                if current_user and not current_user.is_active:
                    current_user = None
        
        return f(current_user, *args, **kwargs)
    
    return decorated
