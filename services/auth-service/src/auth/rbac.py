"""
Role-Based Access Control (RBAC) system for HealthFlow.
Implements fine-grained permissions and role management.
"""

from enum import Enum
from typing import List, Set
from functools import wraps
from flask import g, jsonify
import logging

logger = logging.getLogger(__name__)


class Permission(Enum):
    """System permissions for granular access control."""
    
    # Prescription permissions
    PRESCRIPTION_CREATE = "prescription:create"
    PRESCRIPTION_READ = "prescription:read"
    PRESCRIPTION_UPDATE = "prescription:update"
    PRESCRIPTION_DELETE = "prescription:delete"
    PRESCRIPTION_PROCESS = "prescription:process"
    PRESCRIPTION_VALIDATE = "prescription:validate"
    
    # User permissions
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_ASSIGN_ROLE = "user:assign_role"
    
    # Admin permissions
    ADMIN_VIEW_LOGS = "admin:view_logs"
    ADMIN_MANAGE_SYSTEM = "admin:manage_system"
    ADMIN_VIEW_METRICS = "admin:view_metrics"
    ADMIN_MANAGE_USERS = "admin:manage_users"
    
    # PHI (Protected Health Information) permissions
    PHI_READ_ALL = "phi:read_all"  # Read any patient's PHI
    PHI_READ_OWN = "phi:read_own"  # Read only assigned patients
    PHI_EXPORT = "phi:export"  # Export PHI data
    
    # Review permissions
    REVIEW_REQUIRED = "review:required"  # Can review flagged prescriptions
    REVIEW_OVERRIDE = "review:override"  # Can override AI decisions
    
    # Audit permissions
    AUDIT_VIEW = "audit:view"  # View audit logs
    AUDIT_EXPORT = "audit:export"  # Export audit logs
    
    # Clinical permissions
    CLINICAL_VALIDATE = "clinical:validate"  # Clinical validation
    CLINICAL_OVERRIDE = "clinical:override"  # Override clinical checks


class Role(Enum):
    """Pre-defined system roles."""
    ADMIN = "admin"
    DOCTOR = "doctor"
    PHARMACIST = "pharmacist"
    NURSE = "nurse"
    VIEWER = "viewer"


# Role-Permission mapping
ROLE_PERMISSIONS: dict = {
    Role.ADMIN: {
        # Full system access
        Permission.PRESCRIPTION_CREATE,
        Permission.PRESCRIPTION_READ,
        Permission.PRESCRIPTION_UPDATE,
        Permission.PRESCRIPTION_DELETE,
        Permission.PRESCRIPTION_PROCESS,
        Permission.PRESCRIPTION_VALIDATE,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_ASSIGN_ROLE,
        Permission.ADMIN_VIEW_LOGS,
        Permission.ADMIN_MANAGE_SYSTEM,
        Permission.ADMIN_VIEW_METRICS,
        Permission.ADMIN_MANAGE_USERS,
        Permission.PHI_READ_ALL,
        Permission.PHI_EXPORT,
        Permission.REVIEW_REQUIRED,
        Permission.REVIEW_OVERRIDE,
        Permission.AUDIT_VIEW,
        Permission.AUDIT_EXPORT,
        Permission.CLINICAL_VALIDATE,
        Permission.CLINICAL_OVERRIDE,
    },
    
    Role.DOCTOR: {
        # Doctor permissions
        Permission.PRESCRIPTION_CREATE,
        Permission.PRESCRIPTION_READ,
        Permission.PRESCRIPTION_UPDATE,
        Permission.PRESCRIPTION_PROCESS,
        Permission.PRESCRIPTION_VALIDATE,
        Permission.USER_READ,
        Permission.PHI_READ_OWN,  # Only their patients
        Permission.CLINICAL_VALIDATE,
    },
    
    Role.PHARMACIST: {
        # Pharmacist permissions
        Permission.PRESCRIPTION_READ,
        Permission.PRESCRIPTION_VALIDATE,
        Permission.PRESCRIPTION_PROCESS,
        Permission.USER_READ,
        Permission.PHI_READ_OWN,
        Permission.REVIEW_REQUIRED,  # Can review flagged prescriptions
        Permission.REVIEW_OVERRIDE,  # Can override AI decisions
        Permission.CLINICAL_VALIDATE,
        Permission.CLINICAL_OVERRIDE,
    },
    
    Role.NURSE: {
        # Nurse permissions
        Permission.PRESCRIPTION_READ,
        Permission.USER_READ,
        Permission.PHI_READ_OWN,
    },
    
    Role.VIEWER: {
        # Read-only access
        Permission.PRESCRIPTION_READ,
        Permission.USER_READ,
    }
}


class RBACService:
    """Service for RBAC operations."""
    
    @staticmethod
    def get_permissions_for_roles(roles: List[str]) -> Set[Permission]:
        """
        Get all permissions for given roles.
        
        Args:
            roles: List of role names
            
        Returns:
            Set of permissions
        """
        permissions = set()
        
        for role_name in roles:
            try:
                role = Role(role_name)
                permissions.update(ROLE_PERMISSIONS.get(role, set()))
            except ValueError:
                logger.warning(f"Unknown role: {role_name}")
        
        return permissions
    
    @staticmethod
    def has_permission(user_roles: List[str], required_permission: Permission) -> bool:
        """
        Check if user has required permission.
        
        Args:
            user_roles: User's roles
            required_permission: Required permission
            
        Returns:
            True if user has permission
        """
        user_permissions = RBACService.get_permissions_for_roles(user_roles)
        return required_permission in user_permissions
    
    @staticmethod
    def has_any_permission(user_roles: List[str], required_permissions: Set[Permission]) -> bool:
        """Check if user has any of the required permissions."""
        user_permissions = RBACService.get_permissions_for_roles(user_roles)
        return bool(user_permissions.intersection(required_permissions))
    
    @staticmethod
    def has_all_permissions(user_roles: List[str], required_permissions: Set[Permission]) -> bool:
        """Check if user has all required permissions."""
        user_permissions = RBACService.get_permissions_for_roles(user_roles)
        return required_permissions.issubset(user_permissions)
    
    @staticmethod
    def get_user_permissions(user_roles: List[str]) -> List[str]:
        """
        Get list of permission strings for user.
        
        Args:
            user_roles: User's roles
            
        Returns:
            List of permission strings
        """
        permissions = RBACService.get_permissions_for_roles(user_roles)
        return [p.value for p in permissions]


# Permission decorators
def require_permission(permission: Permission):
    """
    Decorator to require specific permission.
    
    Usage:
        @app.route('/api/prescriptions/<id>', methods=['DELETE'])
        @require_auth
        @require_permission(Permission.PRESCRIPTION_DELETE)
        def delete_prescription(id):
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_roles = g.current_user.get('roles', [])
            
            if not RBACService.has_permission(user_roles, permission):
                logger.warning(
                    f"Permission denied: {permission.value}",
                    extra={
                        'user_id': g.current_user.get('user_id'),
                        'required_permission': permission.value,
                        'user_roles': user_roles
                    }
                )
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_permission': permission.value
                }), 403
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role(role: Role):
    """
    Decorator to require specific role.
    
    Usage:
        @app.route('/api/admin/metrics')
        @require_auth
        @require_role(Role.ADMIN)
        def admin_metrics():
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_roles = g.current_user.get('roles', [])
            
            if role.value not in user_roles:
                logger.warning(
                    f"Role check failed: {role.value}",
                    extra={
                        'user_id': g.current_user.get('user_id'),
                        'required_role': role.value,
                        'user_roles': user_roles
                    }
                )
                return jsonify({
                    'error': 'Insufficient role',
                    'required_role': role.value
                }), 403
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_any_role(*roles: Role):
    """
    Decorator to require any of the specified roles.
    
    Usage:
        @app.route('/api/prescriptions')
        @require_auth
        @require_any_role(Role.DOCTOR, Role.PHARMACIST)
        def list_prescriptions():
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_roles = g.current_user.get('roles', [])
            required_role_values = [r.value for r in roles]
            
            if not any(role in user_roles for role in required_role_values):
                logger.warning(
                    f"Role check failed: requires any of {required_role_values}",
                    extra={
                        'user_id': g.current_user.get('user_id'),
                        'required_roles': required_role_values,
                        'user_roles': user_roles
                    }
                )
                return jsonify({
                    'error': 'Insufficient role',
                    'required_roles': required_role_values
                }), 403
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator

