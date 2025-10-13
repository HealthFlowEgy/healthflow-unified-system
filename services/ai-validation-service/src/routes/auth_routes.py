"""
Authentication API routes
File: src/routes/auth_routes.py
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from services.auth_service import AuthService, token_required
from models.database import db
from models.user import User
from models.prescription import AuditLog
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> tuple:
    """
    Validate password strength
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint
    
    Request Body:
        {
            "email": "user@example.com",
            "password": "password123"
        }
    
    Response:
        {
            "status": "success",
            "message": "Login successful",
            "data": {
                "access_token": "jwt_token",
                "refresh_token": "refresh_jwt_token",
                "token_type": "Bearer",
                "expires_in": 3600,
                "user": {
                    "id": 1,
                    "name": "John Doe",
                    "email": "user@example.com",
                    "role": "pharmacist"
                }
            }
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validate inputs
        if not email or not password:
            return jsonify({
                'status': 'error',
                'message': 'Email and password are required',
                'error_code': 'MISSING_CREDENTIALS'
            }), 400
        
        if not validate_email(email):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email format',
                'error_code': 'INVALID_EMAIL'
            }), 400
        
        # Authenticate user
        user = AuthService.authenticate_user(email, password)
        
        if not user:
            # Log failed login attempt
            AuditLog.log_action(
                user_id=None,
                action='login_failed',
                description=f'Failed login attempt for {email}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or password',
                'error_code': 'INVALID_CREDENTIALS'
            }), 401
        
        # Generate tokens
        access_token, access_expiration = AuthService.generate_token(user.id, user.role)
        refresh_token, refresh_expiration = AuthService.generate_refresh_token(user.id)
        
        # Calculate expires_in for client
        expires_in = int((access_expiration - datetime.utcnow()).total_seconds())
        
        # Log successful login
        AuditLog.log_action(
            user_id=user.id,
            action='login_success',
            description=f'User {user.email} logged in successfully',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'Bearer',
                'expires_in': expires_in,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during login',
            'error_code': 'LOGIN_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    User registration endpoint
    
    Request Body:
        {
            "name": "John Doe",
            "email": "user@example.com",
            "password": "SecurePass123!",
            "role": "pharmacist"
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'pharmacist')
        
        # Validate inputs
        if not name or not email or not password:
            return jsonify({
                'status': 'error',
                'message': 'Name, email, and password are required',
                'error_code': 'MISSING_FIELDS'
            }), 400
        
        if not validate_email(email):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email format',
                'error_code': 'INVALID_EMAIL'
            }), 400
        
        # Validate password strength
        is_valid, error_message = validate_password_strength(password)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': error_message,
                'error_code': 'WEAK_PASSWORD'
            }), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'status': 'error',
                'message': 'User with this email already exists',
                'error_code': 'USER_EXISTS'
            }), 409
        
        # Validate role
        valid_roles = ['pharmacist', 'doctor', 'admin']
        if role not in valid_roles:
            return jsonify({
                'status': 'error',
                'message': f'Invalid role. Must be one of: {", ".join(valid_roles)}',
                'error_code': 'INVALID_ROLE'
            }), 400
        
        # Create new user
        password_hash = AuthService.hash_password(password)
        new_user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            is_active=True
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log registration
        AuditLog.log_action(
            user_id=new_user.id,
            action='user_registered',
            description=f'New user registered: {email}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'data': {
                'user': {
                    'id': new_user.id,
                    'name': new_user.name,
                    'email': new_user.email,
                    'role': new_user.role
                }
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during registration',
            'error_code': 'REGISTRATION_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh access token using refresh token
    
    Request Body:
        {
            "refresh_token": "refresh_jwt_token"
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'refresh_token' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Refresh token is required',
                'error_code': 'MISSING_REFRESH_TOKEN'
            }), 400
        
        refresh_token = data['refresh_token']
        
        result = AuthService.refresh_access_token(refresh_token)
        
        if not result:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired refresh token',
                'error_code': 'INVALID_REFRESH_TOKEN'
            }), 401
        
        access_token, access_expiration = result
        expires_in = int((access_expiration - datetime.utcnow()).total_seconds())
        
        return jsonify({
            'status': 'success',
            'message': 'Token refreshed successfully',
            'data': {
                'access_token': access_token,
                'token_type': 'Bearer',
                'expires_in': expires_in
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during token refresh',
            'error_code': 'REFRESH_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """
    Logout endpoint (client-side token removal)
    
    Note: JWT tokens are stateless. The client should remove the token.
    For token blacklisting, implement a Redis-based solution.
    """
    try:
        # Log logout action
        AuditLog.log_action(
            user_id=current_user.id,
            action='logout',
            description=f'User {current_user.email} logged out',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during logout',
            'error_code': 'LOGOUT_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """
    Get current authenticated user information
    """
    try:
        return jsonify({
            'status': 'success',
            'data': {
                'user': {
                    'id': current_user.id,
                    'name': current_user.name,
                    'email': current_user.email,
                    'role': current_user.role,
                    'is_active': current_user.is_active,
                    'created_at': current_user.created_at.isoformat() if current_user.created_at else None
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An error occurred',
            'error_code': 'GET_USER_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """
    Change user password
    
    Request Body:
        {
            "current_password": "OldPass123!",
            "new_password": "NewPass123!"
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({
                'status': 'error',
                'message': 'Current password and new password are required',
                'error_code': 'MISSING_PASSWORDS'
            }), 400
        
        # Verify current password
        if not AuthService.verify_password(current_password, current_user.password_hash):
            return jsonify({
                'status': 'error',
                'message': 'Current password is incorrect',
                'error_code': 'INCORRECT_PASSWORD'
            }), 401
        
        # Validate new password strength
        is_valid, error_message = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': error_message,
                'error_code': 'WEAK_PASSWORD'
            }), 400
        
        # Update password
        current_user.password_hash = AuthService.hash_password(new_password)
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log password change
        AuditLog.log_action(
            user_id=current_user.id,
            action='password_changed',
            description=f'Password changed for user {current_user.email}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while changing password',
            'error_code': 'PASSWORD_CHANGE_ERROR',
            'details': str(e)
        }), 500


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """
    Verify if a token is valid
    
    Request Body:
        {
            "token": "jwt_token"
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Token is required',
                'error_code': 'MISSING_TOKEN'
            }), 400
        
        token = data['token']
        payload = AuthService.decode_token(token)
        
        if not payload:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired token',
                'error_code': 'INVALID_TOKEN',
                'valid': False
            }), 200
        
        # Check if user still exists and is active
        user = User.query.get(payload['user_id'])
        if not user or not user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'User not found or inactive',
                'error_code': 'USER_INVALID',
                'valid': False
            }), 200
        
        return jsonify({
            'status': 'success',
            'message': 'Token is valid',
            'valid': True,
            'data': {
                'user_id': payload['user_id'],
                'role': payload.get('role'),
                'token_type': payload.get('type')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during token verification',
            'error_code': 'VERIFY_ERROR',
            'details': str(e)
        }), 500
