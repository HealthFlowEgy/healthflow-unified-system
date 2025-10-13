"""
HIPAA-Compliant Audit Logging Service
Tracks all PHI access and system events for compliance
"""
import uuid
from datetime import datetime, timedelta
from functools import wraps
from flask import request, g, session
from typing import List, Optional, Dict, Any
import logging

from src.models.database import db

logger = logging.getLogger(__name__)


class AuditLog(db.Model):
    """
    Audit log model for tracking all PHI access and system events.
    
    Complies with HIPAA Security Rule 45 CFR § 164.312(b) - Audit Controls
    """
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # User information
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    username = db.Column(db.String(100), nullable=False)
    user_role = db.Column(db.String(50), nullable=False)
    
    # Action details
    action = db.Column(db.String(50), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False, index=True)
    resource_id = db.Column(db.String(36), nullable=False, index=True)
    phi_fields_accessed = db.Column(db.JSON)  # List of PHI fields accessed
    
    # Request metadata
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.Text)
    session_id = db.Column(db.String(255))
    request_id = db.Column(db.String(36))
    
    # Access justification (for break-the-glass scenarios)
    access_justification = db.Column(db.Text)
    emergency_access = db.Column(db.Boolean, default=False)
    
    # Result
    result = db.Column(db.String(20), nullable=False)  # SUCCESS, FAILURE, DENIED
    error_message = db.Column(db.Text)
    response_time_ms = db.Column(db.Integer)
    
    # Additional metadata
    metadata = db.Column(db.JSON)
    
    def __repr__(self):
        return f'<AuditLog {self.id} {self.action} {self.resource_type} by {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'username': self.username,
            'user_role': self.user_role,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'phi_fields_accessed': self.phi_fields_accessed,
            'ip_address': self.ip_address,
            'session_id': self.session_id,
            'result': self.result,
            'error_message': self.error_message,
            'response_time_ms': self.response_time_ms
        }


class AuditLoggingService:
    """Service for creating and querying audit logs."""
    
    @staticmethod
    def log_access(
        user_id: str,
        username: str,
        user_role: str,
        action: str,
        resource_type: str,
        resource_id: str,
        phi_fields_accessed: Optional[List[str]] = None,
        result: str = 'SUCCESS',
        error_message: Optional[str] = None,
        response_time_ms: Optional[int] = None,
        access_justification: Optional[str] = None,
        emergency_access: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Args:
            user_id: ID of user performing action
            username: Username
            user_role: User's role
            action: Action performed (VIEW, CREATE, UPDATE, DELETE, etc.)
            resource_type: Type of resource accessed
            resource_id: ID of resource
            phi_fields_accessed: List of PHI fields accessed
            result: Result of action (SUCCESS, FAILURE, DENIED)
            error_message: Error message if failed
            response_time_ms: Response time in milliseconds
            access_justification: Justification for access
            emergency_access: Whether this was emergency access
            metadata: Additional metadata
            
        Returns:
            Created AuditLog instance
        """
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            phi_fields_accessed=phi_fields_accessed,
            ip_address=request.remote_addr if request else 'system',
            user_agent=request.headers.get('User-Agent') if request else None,
            session_id=session.get('id') if session else None,
            request_id=g.get('request_id') if hasattr(g, 'request_id') else None,
            access_justification=access_justification,
            emergency_access=emergency_access,
            result=result,
            error_message=error_message,
            response_time_ms=response_time_ms,
            metadata=metadata
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
        logger.info(f"Audit log created: {action} on {resource_type} {resource_id} by {username}")
        
        return audit_log
    
    @staticmethod
    def get_user_access_history(user_id: str, days: int = 30) -> List[AuditLog]:
        """Get access history for a user."""
        since = datetime.utcnow() - timedelta(days=days)
        return AuditLog.query.filter(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= since
        ).order_by(AuditLog.timestamp.desc()).all()
    
    @staticmethod
    def get_resource_access_history(resource_type: str, resource_id: str) -> List[AuditLog]:
        """Get access history for a specific resource."""
        return AuditLog.query.filter(
            AuditLog.resource_type == resource_type,
            AuditLog.resource_id == resource_id
        ).order_by(AuditLog.timestamp.desc()).all()
    
    @staticmethod
    def get_failed_access_attempts(hours: int = 24) -> List[AuditLog]:
        """Get failed access attempts in the last N hours."""
        since = datetime.utcnow() - timedelta(hours=hours)
        return AuditLog.query.filter(
            AuditLog.result.in_(['FAILURE', 'DENIED']),
            AuditLog.timestamp >= since
        ).order_by(AuditLog.timestamp.desc()).all()
    
    @staticmethod
    def get_emergency_access_logs(days: int = 7) -> List[AuditLog]:
        """Get emergency access logs."""
        since = datetime.utcnow() - timedelta(days=days)
        return AuditLog.query.filter(
            AuditLog.emergency_access == True,
            AuditLog.timestamp >= since
        ).order_by(AuditLog.timestamp.desc()).all()
    
    @staticmethod
    def cleanup_old_logs(retention_days: int = 2555):  # 7 years = 2555 days
        """
        Delete audit logs older than retention period.
        
        HIPAA requires 6 years minimum retention.
        Default is 7 years for safety margin.
        """
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        deleted = AuditLog.query.filter(AuditLog.timestamp < cutoff).delete()
        db.session.commit()
        logger.info(f"Deleted {deleted} audit logs older than {retention_days} days")
        return deleted


def audit_phi_access(resource_type: str, phi_fields: Optional[List[str]] = None):
    """
    Decorator to automatically audit PHI access.
    
    Usage:
        @audit_phi_access('Prescription', phi_fields=['patient_name', 'medications'])
        def get_prescription(prescription_id):
            pass
    
    Args:
        resource_type: Type of resource being accessed
        phi_fields: List of PHI fields accessed (None = all fields)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            import time
            start_time = time.time()
            error = None
            result = "SUCCESS"
            resource_id = None
            
            try:
                # Execute the function
                response = f(*args, **kwargs)
                
                # Try to extract resource ID from kwargs or response
                resource_id = (
                    kwargs.get('id') or 
                    kwargs.get('prescription_id') or
                    kwargs.get('patient_id') or
                    getattr(response, 'id', 'unknown')
                )
                
                return response
                
            except PermissionError as e:
                error = str(e)
                result = "DENIED"
                raise
                
            except Exception as e:
                error = str(e)
                result = "FAILURE"
                raise
                
            finally:
                # Calculate response time
                response_time_ms = int((time.time() - start_time) * 1000)
                
                # Get current user from Flask g object
                current_user = g.get('current_user')
                if current_user:
                    # Log audit entry
                    try:
                        AuditLoggingService.log_access(
                            user_id=current_user.id,
                            username=current_user.username,
                            user_role=current_user.role,
                            action=f.__name__.upper(),
                            resource_type=resource_type,
                            resource_id=str(resource_id) if resource_id else 'unknown',
                            phi_fields_accessed=phi_fields,
                            result=result,
                            error_message=error,
                            response_time_ms=response_time_ms
                        )
                    except Exception as audit_error:
                        # Don't fail the request if audit logging fails
                        logger.error(f"Failed to create audit log: {audit_error}")
        
        return decorated_function
    return decorator

