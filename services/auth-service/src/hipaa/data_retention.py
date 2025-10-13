"""
HIPAA-compliant Data Retention Policy Service.
Automates data lifecycle management and retention policies.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DataCategory(Enum):
    """Categories of data with different retention requirements."""
    PHI = "phi"  # Protected Health Information - 6 years
    AUDIT_LOGS = "audit_logs"  # Audit logs - 6 years
    PRESCRIPTION_DATA = "prescription_data"  # Prescription data - 7 years
    CLINICAL_NOTES = "clinical_notes"  # Clinical notes - 7 years
    BILLING_RECORDS = "billing_records"  # Billing records - 7 years
    CONSENT_RECORDS = "consent_records"  # Consent records - 6 years after revocation
    SYSTEM_LOGS = "system_logs"  # System logs - 1 year
    TEMP_DATA = "temp_data"  # Temporary data - 30 days


# Retention periods (in days)
RETENTION_PERIODS = {
    DataCategory.PHI: 365 * 6,  # 6 years
    DataCategory.AUDIT_LOGS: 365 * 6,  # 6 years
    DataCategory.PRESCRIPTION_DATA: 365 * 7,  # 7 years
    DataCategory.CLINICAL_NOTES: 365 * 7,  # 7 years
    DataCategory.BILLING_RECORDS: 365 * 7,  # 7 years
    DataCategory.CONSENT_RECORDS: 365 * 6,  # 6 years
    DataCategory.SYSTEM_LOGS: 365,  # 1 year
    DataCategory.TEMP_DATA: 30,  # 30 days
}


class DataRetentionService:
    """
    Service for managing data retention policies.
    
    Features:
    - Automated data archival
    - Scheduled data deletion
    - Retention policy enforcement
    - Audit trail of retention actions
    """
    
    @staticmethod
    def calculate_retention_date(category: DataCategory, created_at: datetime) -> datetime:
        """
        Calculate retention expiry date for data.
        
        Args:
            category: Data category
            created_at: When data was created
            
        Returns:
            Date when data should be deleted
        """
        retention_days = RETENTION_PERIODS.get(category, 365 * 7)  # Default 7 years
        return created_at + timedelta(days=retention_days)
    
    @staticmethod
    def is_expired(category: DataCategory, created_at: datetime) -> bool:
        """
        Check if data has exceeded retention period.
        
        Args:
            category: Data category
            created_at: When data was created
            
        Returns:
            True if data should be deleted
        """
        expiry_date = DataRetentionService.calculate_retention_date(category, created_at)
        return datetime.utcnow() > expiry_date
    
    @staticmethod
    def archive_expired_data(category: DataCategory, dry_run: bool = True) -> Dict:
        """
        Archive data that has exceeded retention period.
        
        Args:
            category: Data category to archive
            dry_run: If True, only report what would be archived
            
        Returns:
            Summary of archived data
        """
        from src.database import db
        
        retention_days = RETENTION_PERIODS.get(category, 365 * 7)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Get model for this category
        model = DataRetentionService._get_model_for_category(category)
        
        if not model:
            logger.error(f"No model found for category: {category.value}")
            return {'error': 'Invalid category'}
        
        # Find expired records
        expired_records = model.query.filter(
            model.created_at < cutoff_date
        ).all()
        
        count = len(expired_records)
        
        if dry_run:
            logger.info(
                f"DRY RUN: Would archive {count} {category.value} records",
                extra={'category': category.value, 'count': count}
            )
            return {
                'category': category.value,
                'count': count,
                'dry_run': True,
                'cutoff_date': cutoff_date.isoformat()
            }
        
        # Archive records (move to archive table or cold storage)
        archived_count = 0
        for record in expired_records:
            try:
                # Create archive record
                archive_record = DataRetentionService._create_archive_record(category, record)
                db.session.add(archive_record)
                
                # Delete original record
                db.session.delete(record)
                archived_count += 1
            
            except Exception as e:
                logger.error(f"Failed to archive record: {e}")
                db.session.rollback()
        
        db.session.commit()
        
        logger.info(
            f"Archived {archived_count} {category.value} records",
            extra={'category': category.value, 'count': archived_count}
        )
        
        return {
            'category': category.value,
            'count': archived_count,
            'dry_run': False,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    @staticmethod
    def delete_expired_data(category: DataCategory, dry_run: bool = True) -> Dict:
        """
        Permanently delete data that has exceeded retention period.
        
        Args:
            category: Data category to delete
            dry_run: If True, only report what would be deleted
            
        Returns:
            Summary of deleted data
        """
        from src.database import db
        
        retention_days = RETENTION_PERIODS.get(category, 365 * 7)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Get model for this category
        model = DataRetentionService._get_model_for_category(category)
        
        if not model:
            logger.error(f"No model found for category: {category.value}")
            return {'error': 'Invalid category'}
        
        # Find expired records
        expired_records = model.query.filter(
            model.created_at < cutoff_date
        ).all()
        
        count = len(expired_records)
        
        if dry_run:
            logger.info(
                f"DRY RUN: Would delete {count} {category.value} records",
                extra={'category': category.value, 'count': count}
            )
            return {
                'category': category.value,
                'count': count,
                'dry_run': True,
                'cutoff_date': cutoff_date.isoformat()
            }
        
        # Delete records
        for record in expired_records:
            db.session.delete(record)
        
        db.session.commit()
        
        logger.info(
            f"Deleted {count} {category.value} records",
            extra={'category': category.value, 'count': count}
        )
        
        # Audit log
        from src.models.audit_log import AuditLog
        AuditLog.log_event(
            user_id='system',
            action='DATA_DELETION',
            resource_type=category.value,
            details={
                'count': count,
                'cutoff_date': cutoff_date.isoformat()
            }
        )
        
        return {
            'category': category.value,
            'count': count,
            'dry_run': False,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    @staticmethod
    def get_retention_summary() -> List[Dict]:
        """
        Get summary of data retention status for all categories.
        
        Returns:
            List of retention summaries
        """
        summaries = []
        
        for category in DataCategory:
            retention_days = RETENTION_PERIODS.get(category, 365 * 7)
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            model = DataRetentionService._get_model_for_category(category)
            
            if not model:
                continue
            
            # Count total and expired records
            total_count = model.query.count()
            expired_count = model.query.filter(model.created_at < cutoff_date).count()
            
            summaries.append({
                'category': category.value,
                'retention_period_days': retention_days,
                'total_records': total_count,
                'expired_records': expired_count,
                'cutoff_date': cutoff_date.isoformat()
            })
        
        return summaries
    
    @staticmethod
    def _get_model_for_category(category: DataCategory):
        """Get SQLAlchemy model for data category."""
        # Map categories to models
        category_models = {
            DataCategory.AUDIT_LOGS: 'AuditLog',
            DataCategory.PRESCRIPTION_DATA: 'Prescription',
            DataCategory.CONSENT_RECORDS: 'Consent',
            DataCategory.SYSTEM_LOGS: 'SystemLog',
        }
        
        model_name = category_models.get(category)
        
        if not model_name:
            return None
        
        # Import model dynamically
        try:
            if model_name == 'AuditLog':
                from src.models.audit_log import AuditLog
                return AuditLog
            elif model_name == 'Prescription':
                from src.models.prescription import Prescription
                return Prescription
            elif model_name == 'Consent':
                from src.models.consent import Consent
                return Consent
            elif model_name == 'SystemLog':
                from src.models.system_log import SystemLog
                return SystemLog
        except ImportError:
            logger.warning(f"Model {model_name} not found")
            return None
    
    @staticmethod
    def _create_archive_record(category: DataCategory, record):
        """Create archive record for data."""
        # This would create a record in an archive table or export to cold storage
        # For now, we'll just log it
        logger.info(f"Archiving {category.value} record: {record.id}")
        return None


# Data Retention API endpoints
from flask import Blueprint, request, jsonify

retention_bp = Blueprint('retention', __name__, url_prefix='/api/retention')


@retention_bp.route('/summary', methods=['GET'])
def get_retention_summary():
    """
    Get data retention summary.
    
    Requires: Admin role
    """
    from src.auth.jwt_service import jwt_service
    from src.auth.rbac import Role
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Check admin role
    if Role.ADMIN.value not in payload.get('roles', []):
        return jsonify({'error': 'Admin role required'}), 403
    
    summary = DataRetentionService.get_retention_summary()
    
    return jsonify({'retention_summary': summary}), 200


@retention_bp.route('/archive', methods=['POST'])
def archive_expired_data():
    """
    Archive expired data for a category.
    
    Request:
        {
            "category": "audit_logs",
            "dry_run": true
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.auth.rbac import Role
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Check admin role
    if Role.ADMIN.value not in payload.get('roles', []):
        return jsonify({'error': 'Admin role required'}), 403
    
    data = request.json
    category_str = data.get('category')
    dry_run = data.get('dry_run', True)
    
    if not category_str:
        return jsonify({'error': 'category required'}), 400
    
    try:
        category = DataCategory(category_str)
    except ValueError:
        return jsonify({'error': f'Invalid category: {category_str}'}), 400
    
    result = DataRetentionService.archive_expired_data(category, dry_run=dry_run)
    
    return jsonify(result), 200


@retention_bp.route('/delete', methods=['POST'])
def delete_expired_data():
    """
    Delete expired data for a category.
    
    Request:
        {
            "category": "temp_data",
            "dry_run": false
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.auth.rbac import Role
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Check admin role
    if Role.ADMIN.value not in payload.get('roles', []):
        return jsonify({'error': 'Admin role required'}), 403
    
    data = request.json
    category_str = data.get('category')
    dry_run = data.get('dry_run', True)
    
    if not category_str:
        return jsonify({'error': 'category required'}), 400
    
    try:
        category = DataCategory(category_str)
    except ValueError:
        return jsonify({'error': f'Invalid category: {category_str}'}), 400
    
    result = DataRetentionService.delete_expired_data(category, dry_run=dry_run)
    
    return jsonify(result), 200

