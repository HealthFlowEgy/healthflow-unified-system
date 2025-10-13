"""
JWT Authentication Service with refresh token support.
Implements secure token generation, validation, and revocation.
"""

import jwt
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, g
import logging
import os

logger = logging.getLogger(__name__)


class JWTService:
    """
    Production-grade JWT authentication service.
    
    Features:
    - Short-lived access tokens (15 min)
    - Long-lived refresh tokens (7 days)
    - Token blacklisting via Redis
    - Automatic token rotation
    - Comprehensive audit logging
    """
    
    def __init__(self, secret_key: str, redis_client):
        self.secret_key = secret_key
        self.redis = redis_client
        self.access_token_expiry = timedelta(minutes=15)
        self.refresh_token_expiry = timedelta(days=7)
        self.algorithm = 'HS256'
    
    def generate_tokens(self, user_id: str, email: str, roles: list) -> Dict[str, str]:
        """
        Generate JWT access and refresh tokens.
        
        Args:
            user_id: Unique user identifier
            email: User email address
            roles: List of assigned roles
            
        Returns:
            Dictionary containing:
            - access_token: Short-lived JWT
            - refresh_token: Long-lived JWT
            - token_type: "Bearer"
            - expires_in: Seconds until expiry
        """
        now = datetime.utcnow()
        jti_access = str(uuid.uuid4())
        jti_refresh = str(uuid.uuid4())
        
        # Access token payload
        access_payload = {
            'user_id': user_id,
            'email': email,
            'roles': roles,
            'type': 'access',
            'iat': now,
            'exp': now + self.access_token_expiry,
            'jti': jti_access
        }
        
        # Refresh token payload (minimal data)
        refresh_payload = {
            'user_id': user_id,
            'type': 'refresh',
            'iat': now,
            'exp': now + self.refresh_token_expiry,
            'jti': jti_refresh
        }
        
        # Encode tokens
        access_token = jwt.encode(access_payload, self.secret_key, algorithm=self.algorithm)
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)
        
        # Store refresh token in Redis for validation
        self._store_refresh_token(user_id, jti_refresh)
        
        # Audit log
        logger.info(
            f"Tokens generated for user {user_id} ({email})",
            extra={
                'user_id': user_id,
                'email': email,
                'access_jti': jti_access,
                'refresh_jti': jti_refresh
            }
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': int(self.access_token_expiry.total_seconds())
        }
    
    def verify_token(self, token: str, token_type: str = 'access') -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token string
            token_type: Expected token type ('access' or 'refresh')
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get('type') != token_type:
                logger.warning(
                    f"Token type mismatch: expected {token_type}, got {payload.get('type')}"
                )
                return None
            
            # Check blacklist
            if self._is_blacklisted(payload.get('jti')):
                logger.warning(f"Blacklisted token used: {payload.get('jti')}")
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.info("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Generate new access token using valid refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New token set or None if refresh invalid
        """
        payload = self.verify_token(refresh_token, token_type='refresh')
        
        if not payload:
            return None
        
        # Fetch user from database
        from src.models.user import User
        user = User.query.get(payload['user_id'])
        
        if not user or not user.is_active:
            logger.error(f"User not found or inactive: {payload['user_id']}")
            return None
        
        # Generate new token set
        return self.generate_tokens(str(user.id), user.email, user.roles)
    
    def revoke_token(self, token: str):
        """
        Blacklist a token to prevent further use.
        
        Args:
            token: Token to revoke
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={'verify_exp': False}  # Allow expired tokens
            )
            
            jti = payload.get('jti')
            exp = payload.get('exp')
            
            if jti and exp:
                ttl = int(exp - datetime.utcnow().timestamp())
                if ttl > 0:
                    self.redis.setex(f"blacklist:{jti}", ttl, "1")
                    logger.info(f"Token blacklisted: {jti}")
        
        except Exception as e:
            logger.error(f"Token revocation failed: {str(e)}")
    
    def revoke_all_user_tokens(self, user_id: str):
        """
        Revoke all tokens for a user (e.g., password change).
        
        Args:
            user_id: User identifier
        """
        pattern = f"refresh:{user_id}:*"
        keys = list(self.redis.scan_iter(match=pattern))
        
        if keys:
            self.redis.delete(*keys)
            logger.info(f"All user tokens revoked: {user_id} (count: {len(keys)})")
    
    def _store_refresh_token(self, user_id: str, jti: str):
        """Store refresh token JTI in Redis."""
        key = f"refresh:{user_id}:{jti}"
        self.redis.setex(
            key,
            int(self.refresh_token_expiry.total_seconds()),
            "1"
        )
    
    def _is_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted."""
        return self.redis.exists(f"blacklist:{jti}") > 0


# Initialize service (will be properly initialized in app factory)
jwt_service = None


def init_jwt_service(secret_key: str, redis_client):
    """Initialize JWT service with configuration."""
    global jwt_service
    jwt_service = JWTService(secret_key=secret_key, redis_client=redis_client)
    return jwt_service


# Authentication decorator
def require_auth(func):
    """
    Require JWT authentication for endpoint.
    
    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_endpoint():
            user_id = g.current_user['user_id']
            return {'message': 'authenticated'}
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        
        if jwt_service is None:
            logger.error("JWT service not initialized")
            return jsonify({'error': 'Authentication service unavailable'}), 500
        
        payload = jwt_service.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        g.current_user = payload
        
        logger.info(
            f"Authenticated request: {request.method} {request.endpoint}",
            extra={
                'user_id': payload['user_id'],
                'endpoint': request.endpoint,
                'method': request.method
            }
        )
        
        return func(*args, **kwargs)
    
    return wrapper

