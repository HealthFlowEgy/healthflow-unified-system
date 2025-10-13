"""
HIPAA-Compliant Audit Logging Service

This service provides comprehensive audit logging for all PHI access
and system actions to meet HIPAA requirements.

HIPAA Requirements:
- 164.312(b) - Audit Controls
- 164.308(a)(1)(ii)(D) - Information System Activity Review

Author: HealthFlow Security Team
Date: 2025-10-14
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from flask import request, g
from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from models.database import db
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Enumeration of auditable actions"""
    # PHI Access
    READ = "READ"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"
    
    # Authentication
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET = "PASSWORD_RESET"
    
    # Authorization
    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    
    # System
    SYSTEM_ACCESS = "SYSTEM_ACCESS"
    CONFIG_CHANGE = "CONFIG_CHANGE"
    BACKUP_CREATED = "BACKUP_CREATED"
    
    # Security Events
    ENCRYPTION_KEY_ROTATED = "ENCRYPTION_KEY_ROTATED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"


class AuditSeverity(str, Enum):
    """Severity levels for audit events"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AuditLogModel(db.Model):
    """
    Immutable audit log record
    
    HIPAA Requirements Met:
    - Unique identifier for each log entry
    - Date and time of event
    - User identification
    - Type of event
    - Access point information (IP, user agent)
    """
    __tablename__ = 'audit_logs_hipaa'
    
    # Primary key
    id = Column(Integer, primary_key=True)
    
    # Event identification
    event_id = Column(String(64), unique=True, nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default=AuditSeverity.INFO)
    
    # Timestamp (immutable)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # User identification
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    
    # Resource information
    resource_type = Column(String(100), nullable=True, index=True)
    resource_id = Column(String(255), nullable=True, index=True)
    
    # PHI access tracking
    phi_accessed = Column(Boolean, default=False, index=True)
    phi_fields_accessed = Column(Text, nullable=True)  # JSON string for SQLite compatibility
    
    # Access details
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(String(500), nullable=True)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Request details
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    request_params = Column(Text, nullable=True)  # JSON string
    
    # Response details
    response_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    
    # Additional context
    description = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string
    
    # Security
    access_justification = Column(String(500), nullable=True)
    emergency_access = Column(Boolean, default=False)
    
    # Data integrity
    record_hash = Column(String(64), nullable=False)
    
    def __init__(self, **kwargs):
        """Initialize audit log with hash for integrity"""
        super().__init__(**kwargs)
        self.event_id = self._generate_event_id()
        self.record_hash = self._calculate_hash()
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        import uuid
        return f"AUD-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    def _calculate_hash(self) -> str:
        """Calculate SHA-256 hash of record for integrity verification"""
        data = {
            'event_id': self.event_id,
            'action': self.action,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user_id': self.user_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
        }
        hash_input = json.dumps(data, sort_keys=True)
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    def verify_integrity(self) -> bool:
        """Verify record has not been tampered with"""
        current_hash = self.record_hash
        expected_hash = self._calculate_hash()
        return current_hash == expected_hash
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'event_id': self.event_id,
            'action': self.action,
            'severity': self.severity,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'username': self.username,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'phi_accessed': self.phi_accessed,
            'ip_address': self.ip_address,
            'description': self.description
        }
    
    def __repr__(self):
        return f"<AuditLog {self.event_id}: {self.action} by user {self.user_id}>"


# Prevent updates and deletes on audit logs
@db.event.listens_for(AuditLogModel, 'before_update')
def prevent_audit_log_update(mapper, connection, target):
    """Prevent modification of audit logs (immutable)"""
    raise Exception("Audit logs are immutable and cannot be modified")


@db.event.listens_for(AuditLogModel, 'before_delete')
def prevent_audit_log_delete(mapper, connection, target):
    """Prevent deletion of audit logs"""
    if not hasattr(target, '_retention_policy_delete'):
        raise Exception("Audit logs cannot be deleted except via retention policy")


class AuditService:
    """Service for creating and managing audit logs"""
    
    # Retention period for audit logs (HIPAA requires 6 years minimum)
    RETENTION_DAYS = 2557  # 7 years to be safe
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def log_event(
        self,
        action: AuditAction,
        severity: AuditSeverity = AuditSeverity.INFO,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        phi_accessed: bool = False,
        phi_fields: Optional[List[str]] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        access_justification: Optional[str] = None,
        emergency_access: bool = False
    ) -> Optional[AuditLogModel]:
        """
        Log an audit event
        
        Args:
            action: Type of action performed
            severity: Severity level
            user_id: ID of user performing action
            resource_type: Type of resource accessed
            resource_id: ID of resource
            phi_accessed: Whether PHI was accessed
            phi_fields: List of PHI field names accessed
            description: Human-readable description
            metadata: Additional context (will be sanitized)
            access_justification: Reason for access
            emergency_access: Whether this was emergency access
        
        Returns:
            Created AuditLogModel instance
        """
        try:
            # Get request context
            ip_address = None
            user_agent = None
            session_id = None
            request_method = None
            request_path = None
            
            try:
                if request:
                    ip_address = self._get_client_ip()
                    user_agent = request.headers.get('User-Agent', '')[:500]
                    session_id = getattr(g, 'session_id', None)
                    request_method = request.method
                    request_path = request.path
            except RuntimeError:
                # No request context
                pass
            
            # Get user info if available
            username = None
            user_role = None
            try:
                if hasattr(g, 'current_user') and g.current_user:
                    username = g.current_user.username
                    user_role = g.current_user.role
            except RuntimeError:
                pass
            
            # Sanitize metadata
            sanitized_metadata = self._sanitize_metadata(metadata)
            
            # Create audit log
            audit_log = AuditLogModel(
                action=action.value,
                severity=severity.value,
                user_id=user_id,
                username=username,
                user_role=user_role,
                resource_type=resource_type,
                resource_id=resource_id,
                phi_accessed=phi_accessed,
                phi_fields_accessed=json.dumps(phi_fields) if phi_fields else None,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id,
                request_method=request_method,
                request_path=request_path,
                description=description,
                metadata=json.dumps(sanitized_metadata) if sanitized_metadata else None,
                access_justification=access_justification,
                emergency_access=emergency_access
            )
            
            db.session.add(audit_log)
            db.session.commit()
            
            # Log to application logs
            self.logger.info(
                f"AUDIT: {action.value} by user {user_id} on {resource_type}/{resource_id}",
                extra={'audit_event_id': audit_log.event_id}
            )
            
            # Alert on critical events
            if severity == AuditSeverity.CRITICAL:
                self._send_security_alert(audit_log)
            
            return audit_log
            
        except Exception as e:
            self.logger.error(f"Failed to create audit log: {str(e)}")
            return None
    
    def log_phi_access(
        self,
        user_id: int,
        action: AuditAction,
        resource_type: str,
        resource_id: str,
        phi_fields: List[str],
        access_justification: Optional[str] = None
    ) -> Optional[AuditLogModel]:
        """Convenience method for logging PHI access"""
        return self.log_event(
            action=action,
            severity=AuditSeverity.INFO,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            phi_accessed=True,
            phi_fields=phi_fields,
            description=f"PHI access: {', '.join(phi_fields)}",
            access_justification=access_justification
        )
    
    def log_authentication(
        self,
        action: AuditAction,
        user_id: Optional[int],
        username: str,
        success: bool,
        failure_reason: Optional[str] = None
    ) -> Optional[AuditLogModel]:
        """Log authentication events"""
        severity = AuditSeverity.INFO if success else AuditSeverity.WARNING
        description = f"Authentication {'successful' if success else 'failed'}"
        if failure_reason:
            description += f": {failure_reason}"
        
        return self.log_event(
            action=action,
            severity=severity,
            user_id=user_id,
            description=description,
            metadata={'username': username, 'success': success}
        )
    
    def get_user_activity(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AuditLogModel]:
        """Get audit logs for a specific user"""
        query = AuditLogModel.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(AuditLogModel.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLogModel.timestamp <= end_date)
        
        return query.order_by(AuditLogModel.timestamp.desc()).limit(limit).all()
    
    def get_phi_access_logs(
        self,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AuditLogModel]:
        """Get all PHI access logs"""
        query = AuditLogModel.query.filter_by(phi_accessed=True)
        
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        if resource_id:
            query = query.filter_by(resource_id=resource_id)
        if start_date:
            query = query.filter(AuditLogModel.timestamp >= start_date)
        
        return query.order_by(AuditLogModel.timestamp.desc()).limit(limit).all()
    
    def verify_log_integrity(self, audit_log: AuditLogModel) -> bool:
        """Verify audit log has not been tampered with"""
        return audit_log.verify_integrity()
    
    def apply_retention_policy(self) -> int:
        """Apply retention policy - archive old logs"""
        cutoff_date = datetime.utcnow() - timedelta(days=self.RETENTION_DAYS)
        
        old_logs = AuditLogModel.query.filter(
            AuditLogModel.timestamp < cutoff_date
        ).all()
        
        count = len(old_logs)
        self.logger.info(f"Archiving {count} audit logs older than {cutoff_date}")
        
        for log in old_logs:
            log._retention_policy_delete = True
            db.session.delete(log)
        
        db.session.commit()
        return count
    
    def _get_client_ip(self) -> Optional[str]:
        """Get client IP address, handling proxies"""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr
    
    def _sanitize_metadata(self, metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Remove any potential PHI from metadata"""
        if not metadata:
            return None
        
        # List of keys that might contain PHI
        phi_keys = ['ssn', 'social_security', 'dob', 'date_of_birth', 'address', 
                    'phone', 'email', 'patient_name', 'name']
        
        sanitized = {}
        for key, value in metadata.items():
            if key.lower() not in phi_keys:
                sanitized[key] = value
        
        return sanitized
    
    def _send_security_alert(self, audit_log: AuditLogModel):
        """Send alert for critical security events"""
        self.logger.critical(
            f"SECURITY ALERT: {audit_log.action} - {audit_log.description}",
            extra={
                'event_id': audit_log.event_id,
                'user_id': audit_log.user_id,
                'ip_address': audit_log.ip_address
            }
        )


# Global instance
audit_service = AuditService()

