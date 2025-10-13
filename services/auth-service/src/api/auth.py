"""
Authentication API endpoints.
Provides login, logout, token refresh, and password management.
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime
import bcrypt
import logging

logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and return JWT tokens.
    
    Request:
        {
            "email": "user@example.com",
            "password": "SecurePass123!"
        }
    
    Response:
        {
            "access_token": "eyJ...",
            "refresh_token": "eyJ...",
            "token_type": "Bearer",
            "expires_in": 900,
            "user": {
                "id": "123",
                "email": "user@example.com",
                "roles": ["doctor"]
            }
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.models.user import User
    from src.models.audit_log import AuditLog
    from src.database import db
    
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        logger.warning(f"Login attempt - user not found: {email}")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Verify password
    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        logger.warning(f"Login attempt - wrong password: {user.id}")
        
        # Increment failed attempts
        user.failed_login_attempts = getattr(user, 'failed_login_attempts', 0) + 1
        if user.failed_login_attempts >= 5:
            user.is_active = False  # Lock account
            logger.error(f"Account locked after 5 failed attempts: {user.id}")
        
        db.session.commit()
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if account is active
    if not user.is_active:
        logger.warning(f"Login attempt - inactive account: {user.id}")
        return jsonify({'error': 'Account is disabled'}), 403
    
    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Generate tokens
    tokens = jwt_service.generate_tokens(
        user_id=str(user.id),
        email=user.email,
        roles=user.roles if hasattr(user, 'roles') else ['viewer']
    )
    
    # Audit log
    try:
        AuditLog.log_event(
            user_id=user.id,
            action='LOGIN',
            resource_type='Auth',
            ip_address=request.remote_addr
        )
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
    
    # Return tokens and user info
    response = {
        **tokens,
        'user': {
            'id': str(user.id),
            'email': user.email,
            'full_name': getattr(user, 'full_name', ''),
            'roles': user.roles if hasattr(user, 'roles') else ['viewer']
        }
    }
    
    return jsonify(response), 200


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh access token using refresh token.
    
    Request:
        {
            "refresh_token": "eyJ..."
        }
    
    Response:
        {
            "access_token": "eyJ...",
            "refresh_token": "eyJ...",
            "token_type": "Bearer",
            "expires_in": 900
        }
    """
    from src.auth.jwt_service import jwt_service
    
    data = request.json
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'Refresh token required'}), 400
    
    # Generate new tokens
    tokens = jwt_service.refresh_access_token(refresh_token)
    
    if not tokens:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401
    
    return jsonify(tokens), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout user and revoke tokens.
    
    Request:
        Authorization: Bearer <access_token>
        {
            "refresh_token": "eyJ..."
        }
    """
    from src.auth.jwt_service import jwt_service, require_auth
    from src.models.audit_log import AuditLog
    
    # Get tokens
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        access_token = auth_header.split(' ')[1]
        jwt_service.revoke_token(access_token)
    
    refresh_token = request.json.get('refresh_token') if request.json else None
    if refresh_token:
        jwt_service.revoke_token(refresh_token)
    
    # Audit log (if user is authenticated)
    if hasattr(g, 'current_user'):
        try:
            AuditLog.log_event(
                user_id=g.current_user['user_id'],
                action='LOGOUT',
                resource_type='Auth',
                ip_address=request.remote_addr
            )
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """
    Get current authenticated user info.
    
    Requires: Authorization header with Bearer token
    
    Response:
        {
            "user_id": "123",
            "email": "user@example.com",
            "full_name": "Dr. John Doe",
            "roles": ["doctor", "admin"],
            "permissions": [...]
        }
    """
    from src.auth.jwt_service import require_auth
    from src.auth.rbac import RBACService
    from src.models.user import User
    
    # This endpoint requires authentication
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    from src.auth.jwt_service import jwt_service
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user permissions
    permissions = RBACService.get_user_permissions(
        user.roles if hasattr(user, 'roles') else ['viewer']
    )
    
    return jsonify({
        'user_id': str(user.id),
        'email': user.email,
        'full_name': getattr(user, 'full_name', ''),
        'roles': user.roles if hasattr(user, 'roles') else ['viewer'],
        'permissions': permissions,
        'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None,
        'is_active': user.is_active
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Change user password.
    
    Requires: Authorization header with Bearer token
    
    Request:
        {
            "current_password": "old123",
            "new_password": "new456"
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.models.user import User
    from src.models.audit_log import AuditLog
    from src.database import db
    
    # Authenticate user
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password required'}), 400
    
    # Validate new password strength
    if len(new_password) < 12:
        return jsonify({'error': 'Password must be at least 12 characters'}), 400
    
    # Get user
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify current password
    if not bcrypt.checkpw(current_password.encode(), user.password_hash.encode()):
        return jsonify({'error': 'Current password incorrect'}), 401
    
    # Hash new password
    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    
    # Update password
    user.password_hash = new_hash
    if hasattr(user, 'password_changed_at'):
        user.password_changed_at = datetime.utcnow()
    db.session.commit()
    
    # Revoke all existing tokens
    jwt_service.revoke_all_user_tokens(str(user.id))
    
    # Audit log
    try:
        AuditLog.log_event(
            user_id=user.id,
            action='PASSWORD_CHANGE',
            resource_type='Auth',
            ip_address=request.remote_addr
        )
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
    
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """
    Verify if a token is valid.
    
    Request:
        {
            "token": "eyJ..."
        }
    
    Response:
        {
            "valid": true,
            "payload": {...}
        }
    """
    from src.auth.jwt_service import jwt_service
    
    data = request.json
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Token required'}), 400
    
    payload = jwt_service.verify_token(token)
    
    if payload:
        return jsonify({
            'valid': True,
            'payload': payload
        }), 200
    else:
        return jsonify({
            'valid': False
        }), 200

