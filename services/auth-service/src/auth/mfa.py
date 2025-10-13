"""
Multi-Factor Authentication (MFA) service using TOTP (Time-based One-Time Password).
Implements RFC 6238 TOTP standard.
"""

import pyotp
import qrcode
import io
import base64
import secrets
from typing import Optional, Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MFAService:
    """
    Multi-Factor Authentication service using TOTP.
    
    Features:
    - TOTP-based MFA (RFC 6238)
    - QR code generation for easy setup
    - Backup codes for account recovery
    - MFA enrollment and verification
    """
    
    def __init__(self, issuer_name: str = "HealthFlow"):
        self.issuer_name = issuer_name
    
    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret for a user.
        
        Returns:
            Base32-encoded secret key
        """
        return pyotp.random_base32()
    
    def generate_qr_code(self, secret: str, email: str) -> str:
        """
        Generate QR code for TOTP setup.
        
        Args:
            secret: TOTP secret key
            email: User's email address
            
        Returns:
            Base64-encoded PNG image of QR code
        """
        # Create TOTP URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=email,
            issuer_name=self.issuer_name
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_token(self, secret: str, token: str, window: int = 1) -> bool:
        """
        Verify TOTP token.
        
        Args:
            secret: User's TOTP secret
            token: 6-digit TOTP token
            window: Number of time windows to check (default 1 = ±30 seconds)
            
        Returns:
            True if token is valid
        """
        if not token or len(token) != 6:
            return False
        
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=window)
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """
        Generate backup codes for account recovery.
        
        Args:
            count: Number of backup codes to generate
            
        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(count):
            # Generate 8-character alphanumeric code
            code = secrets.token_hex(4).upper()
            codes.append(code)
        
        return codes
    
    def verify_backup_code(self, stored_codes: List[str], provided_code: str) -> bool:
        """
        Verify backup code and remove it from the list.
        
        Args:
            stored_codes: List of valid backup codes
            provided_code: Code provided by user
            
        Returns:
            True if code is valid
        """
        provided_code = provided_code.upper().strip()
        
        if provided_code in stored_codes:
            stored_codes.remove(provided_code)
            return True
        
        return False
    
    def get_current_token(self, secret: str) -> str:
        """
        Get current TOTP token (for testing purposes only).
        
        Args:
            secret: TOTP secret
            
        Returns:
            Current 6-digit token
        """
        totp = pyotp.TOTP(secret)
        return totp.now()


# Initialize MFA service
mfa_service = MFAService(issuer_name="HealthFlow AI")


# MFA API endpoints
from flask import Blueprint, request, jsonify, g

mfa_bp = Blueprint('mfa', __name__, url_prefix='/api/mfa')


@mfa_bp.route('/enroll', methods=['POST'])
def enroll_mfa():
    """
    Enroll user in MFA.
    
    Requires: Authentication
    
    Response:
        {
            "secret": "BASE32SECRET",
            "qr_code": "data:image/png;base64,...",
            "backup_codes": ["CODE1", "CODE2", ...]
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.models.user import User
    from src.database import db
    
    # Authenticate user
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Generate MFA secret
    secret = mfa_service.generate_secret()
    qr_code = mfa_service.generate_qr_code(secret, user.email)
    backup_codes = mfa_service.generate_backup_codes()
    
    # Store secret and backup codes (not yet enabled)
    if not hasattr(user, 'mfa_secret'):
        # Add attributes dynamically if model doesn't have them
        user.mfa_secret = secret
        user.mfa_backup_codes = backup_codes
        user.mfa_enabled = False
    else:
        user.mfa_secret = secret
        user.mfa_backup_codes = backup_codes
        user.mfa_enabled = False
    
    db.session.commit()
    
    logger.info(f"MFA enrollment initiated for user {user.id}")
    
    return jsonify({
        'secret': secret,
        'qr_code': qr_code,
        'backup_codes': backup_codes,
        'message': 'Scan QR code with your authenticator app and verify to enable MFA'
    }), 200


@mfa_bp.route('/enable', methods=['POST'])
def enable_mfa():
    """
    Enable MFA after verifying setup.
    
    Requires: Authentication
    
    Request:
        {
            "token": "123456"
        }
    
    Response:
        {
            "message": "MFA enabled successfully"
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
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get TOTP token from request
    data = request.json
    totp_token = data.get('token')
    
    if not totp_token:
        return jsonify({'error': 'TOTP token required'}), 400
    
    # Verify token
    if not hasattr(user, 'mfa_secret') or not user.mfa_secret:
        return jsonify({'error': 'MFA not enrolled. Call /enroll first'}), 400
    
    if not mfa_service.verify_token(user.mfa_secret, totp_token):
        return jsonify({'error': 'Invalid TOTP token'}), 401
    
    # Enable MFA
    user.mfa_enabled = True
    user.mfa_enabled_at = datetime.utcnow()
    db.session.commit()
    
    # Audit log
    try:
        AuditLog.log_event(
            user_id=user.id,
            action='MFA_ENABLED',
            resource_type='Auth',
            ip_address=request.remote_addr
        )
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
    
    logger.info(f"MFA enabled for user {user.id}")
    
    return jsonify({'message': 'MFA enabled successfully'}), 200


@mfa_bp.route('/disable', methods=['POST'])
def disable_mfa():
    """
    Disable MFA for user.
    
    Requires: Authentication + TOTP token
    
    Request:
        {
            "token": "123456"
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
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get TOTP token from request
    data = request.json
    totp_token = data.get('token')
    
    if not totp_token:
        return jsonify({'error': 'TOTP token required'}), 400
    
    # Verify token
    if not hasattr(user, 'mfa_secret') or not user.mfa_secret:
        return jsonify({'error': 'MFA not enabled'}), 400
    
    if not mfa_service.verify_token(user.mfa_secret, totp_token):
        return jsonify({'error': 'Invalid TOTP token'}), 401
    
    # Disable MFA
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_backup_codes = None
    db.session.commit()
    
    # Audit log
    try:
        AuditLog.log_event(
            user_id=user.id,
            action='MFA_DISABLED',
            resource_type='Auth',
            ip_address=request.remote_addr
        )
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
    
    logger.info(f"MFA disabled for user {user.id}")
    
    return jsonify({'message': 'MFA disabled successfully'}), 200


@mfa_bp.route('/verify', methods=['POST'])
def verify_mfa():
    """
    Verify MFA token during login.
    
    Request:
        {
            "user_id": "123",
            "token": "123456"
        }
    
    Response:
        {
            "valid": true
        }
    """
    from src.models.user import User
    
    data = request.json
    user_id = data.get('user_id')
    totp_token = data.get('token')
    
    if not user_id or not totp_token:
        return jsonify({'error': 'User ID and token required'}), 400
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not hasattr(user, 'mfa_enabled') or not user.mfa_enabled:
        return jsonify({'error': 'MFA not enabled for this user'}), 400
    
    # Verify token
    valid = mfa_service.verify_token(user.mfa_secret, totp_token)
    
    return jsonify({'valid': valid}), 200


@mfa_bp.route('/backup-codes', methods=['GET'])
def get_backup_codes():
    """
    Get remaining backup codes for user.
    
    Requires: Authentication
    """
    from src.auth.jwt_service import jwt_service
    from src.models.user import User
    
    # Authenticate user
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not hasattr(user, 'mfa_enabled') or not user.mfa_enabled:
        return jsonify({'error': 'MFA not enabled'}), 400
    
    backup_codes = user.mfa_backup_codes if hasattr(user, 'mfa_backup_codes') else []
    
    return jsonify({
        'backup_codes': backup_codes,
        'remaining': len(backup_codes)
    }), 200


@mfa_bp.route('/regenerate-backup-codes', methods='POST'])
def regenerate_backup_codes():
    """
    Regenerate backup codes.
    
    Requires: Authentication + TOTP token
    
    Request:
        {
            "token": "123456"
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.models.user import User
    from src.database import db
    
    # Authenticate user
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get TOTP token from request
    data = request.json
    totp_token = data.get('token')
    
    if not totp_token:
        return jsonify({'error': 'TOTP token required'}), 400
    
    # Verify token
    if not hasattr(user, 'mfa_secret') or not user.mfa_secret:
        return jsonify({'error': 'MFA not enabled'}), 400
    
    if not mfa_service.verify_token(user.mfa_secret, totp_token):
        return jsonify({'error': 'Invalid TOTP token'}), 401
    
    # Generate new backup codes
    new_codes = mfa_service.generate_backup_codes()
    user.mfa_backup_codes = new_codes
    db.session.commit()
    
    logger.info(f"Backup codes regenerated for user {user.id}")
    
    return jsonify({
        'backup_codes': new_codes,
        'message': 'Backup codes regenerated successfully'
    }), 200

