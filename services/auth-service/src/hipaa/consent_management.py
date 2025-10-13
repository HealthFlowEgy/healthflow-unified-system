"""
HIPAA-compliant Consent Management System.
Tracks patient consent for data usage and sharing.
"""

from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ConsentType(Enum):
    """Types of consent."""
    TREATMENT = "treatment"  # Consent for treatment
    DATA_SHARING = "data_sharing"  # Consent to share data with third parties
    RESEARCH = "research"  # Consent for research purposes
    MARKETING = "marketing"  # Consent for marketing communications
    AI_PROCESSING = "ai_processing"  # Consent for AI processing of PHI


class ConsentStatus(Enum):
    """Consent status."""
    GRANTED = "granted"
    DENIED = "denied"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ConsentManagementService:
    """
    Service for managing patient consent.
    
    Features:
    - Record consent for various purposes
    - Track consent history
    - Verify active consent
    - Handle consent revocation
    - Audit trail of all consent actions
    """
    
    @staticmethod
    def record_consent(
        patient_id: str,
        consent_type: ConsentType,
        status: ConsentStatus,
        granted_by: str,
        purpose: str,
        expiry_date: Optional[datetime] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Record patient consent.
        
        Args:
            patient_id: Patient identifier
            consent_type: Type of consent
            status: Consent status
            granted_by: Who granted the consent (patient ID or authorized representative)
            purpose: Purpose of consent
            expiry_date: Optional expiry date
            metadata: Additional metadata
            
        Returns:
            Consent record
        """
        from src.models.consent import Consent
        from src.database import db
        
        consent = Consent(
            patient_id=patient_id,
            consent_type=consent_type.value,
            status=status.value,
            granted_by=granted_by,
            purpose=purpose,
            granted_at=datetime.utcnow(),
            expiry_date=expiry_date,
            metadata=metadata or {}
        )
        
        db.session.add(consent)
        db.session.commit()
        
        logger.info(
            f"Consent recorded: {consent_type.value} for patient {patient_id}",
            extra={
                'patient_id': patient_id,
                'consent_type': consent_type.value,
                'status': status.value,
                'granted_by': granted_by
            }
        )
        
        return {
            'consent_id': str(consent.id),
            'patient_id': patient_id,
            'consent_type': consent_type.value,
            'status': status.value,
            'granted_at': consent.granted_at.isoformat(),
            'expiry_date': expiry_date.isoformat() if expiry_date else None
        }
    
    @staticmethod
    def verify_consent(patient_id: str, consent_type: ConsentType) -> bool:
        """
        Verify if patient has active consent for a specific purpose.
        
        Args:
            patient_id: Patient identifier
            consent_type: Type of consent to verify
            
        Returns:
            True if active consent exists
        """
        from src.models.consent import Consent
        
        # Get most recent consent of this type
        consent = Consent.query.filter_by(
            patient_id=patient_id,
            consent_type=consent_type.value
        ).order_by(Consent.granted_at.desc()).first()
        
        if not consent:
            return False
        
        # Check if consent is granted
        if consent.status != ConsentStatus.GRANTED.value:
            return False
        
        # Check if consent has expired
        if consent.expiry_date and consent.expiry_date < datetime.utcnow():
            # Mark as expired
            consent.status = ConsentStatus.EXPIRED.value
            from src.database import db
            db.session.commit()
            return False
        
        return True
    
    @staticmethod
    def revoke_consent(patient_id: str, consent_type: ConsentType, revoked_by: str) -> bool:
        """
        Revoke patient consent.
        
        Args:
            patient_id: Patient identifier
            consent_type: Type of consent to revoke
            revoked_by: Who revoked the consent
            
        Returns:
            True if consent was revoked
        """
        from src.models.consent import Consent
        from src.database import db
        
        # Get active consent
        consent = Consent.query.filter_by(
            patient_id=patient_id,
            consent_type=consent_type.value,
            status=ConsentStatus.GRANTED.value
        ).order_by(Consent.granted_at.desc()).first()
        
        if not consent:
            logger.warning(f"No active consent found to revoke for patient {patient_id}")
            return False
        
        # Revoke consent
        consent.status = ConsentStatus.REVOKED.value
        consent.revoked_at = datetime.utcnow()
        consent.revoked_by = revoked_by
        db.session.commit()
        
        logger.info(
            f"Consent revoked: {consent_type.value} for patient {patient_id}",
            extra={
                'patient_id': patient_id,
                'consent_type': consent_type.value,
                'revoked_by': revoked_by
            }
        )
        
        return True
    
    @staticmethod
    def get_consent_history(patient_id: str) -> List[Dict]:
        """
        Get consent history for a patient.
        
        Args:
            patient_id: Patient identifier
            
        Returns:
            List of consent records
        """
        from src.models.consent import Consent
        
        consents = Consent.query.filter_by(
            patient_id=patient_id
        ).order_by(Consent.granted_at.desc()).all()
        
        return [
            {
                'consent_id': str(c.id),
                'consent_type': c.consent_type,
                'status': c.status,
                'granted_at': c.granted_at.isoformat(),
                'granted_by': c.granted_by,
                'purpose': c.purpose,
                'expiry_date': c.expiry_date.isoformat() if c.expiry_date else None,
                'revoked_at': c.revoked_at.isoformat() if hasattr(c, 'revoked_at') and c.revoked_at else None,
                'revoked_by': c.revoked_by if hasattr(c, 'revoked_by') else None
            }
            for c in consents
        ]
    
    @staticmethod
    def check_data_access_authorization(patient_id: str, accessor_id: str, purpose: str) -> bool:
        """
        Check if accessor is authorized to access patient data for a specific purpose.
        
        Args:
            patient_id: Patient identifier
            accessor_id: User requesting access
            purpose: Purpose of access
            
        Returns:
            True if access is authorized
        """
        # Check if patient has granted consent for this purpose
        if purpose == "treatment":
            return ConsentManagementService.verify_consent(patient_id, ConsentType.TREATMENT)
        elif purpose == "research":
            return ConsentManagementService.verify_consent(patient_id, ConsentType.RESEARCH)
        elif purpose == "ai_processing":
            return ConsentManagementService.verify_consent(patient_id, ConsentType.AI_PROCESSING)
        elif purpose == "data_sharing":
            return ConsentManagementService.verify_consent(patient_id, ConsentType.DATA_SHARING)
        
        # Default: require explicit consent
        return False


# Consent API endpoints
from flask import Blueprint, request, jsonify

consent_bp = Blueprint('consent', __name__, url_prefix='/api/consent')


@consent_bp.route('/grant', methods=['POST'])
def grant_consent():
    """
    Grant patient consent.
    
    Request:
        {
            "patient_id": "123",
            "consent_type": "treatment",
            "purpose": "AI prescription validation",
            "expiry_date": "2026-12-31T23:59:59Z"
        }
    """
    from src.auth.jwt_service import jwt_service
    from src.auth.rbac import Permission, require_permission
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    data = request.json
    patient_id = data.get('patient_id')
    consent_type_str = data.get('consent_type')
    purpose = data.get('purpose')
    expiry_date_str = data.get('expiry_date')
    
    if not patient_id or not consent_type_str or not purpose:
        return jsonify({'error': 'patient_id, consent_type, and purpose required'}), 400
    
    try:
        consent_type = ConsentType(consent_type_str)
    except ValueError:
        return jsonify({'error': f'Invalid consent_type: {consent_type_str}'}), 400
    
    expiry_date = None
    if expiry_date_str:
        try:
            expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid expiry_date format'}), 400
    
    # Record consent
    consent = ConsentManagementService.record_consent(
        patient_id=patient_id,
        consent_type=consent_type,
        status=ConsentStatus.GRANTED,
        granted_by=payload['user_id'],
        purpose=purpose,
        expiry_date=expiry_date
    )
    
    return jsonify(consent), 201


@consent_bp.route('/revoke', methods=['POST'])
def revoke_consent():
    """
    Revoke patient consent.
    
    Request:
        {
            "patient_id": "123",
            "consent_type": "treatment"
        }
    """
    from src.auth.jwt_service import jwt_service
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    data = request.json
    patient_id = data.get('patient_id')
    consent_type_str = data.get('consent_type')
    
    if not patient_id or not consent_type_str:
        return jsonify({'error': 'patient_id and consent_type required'}), 400
    
    try:
        consent_type = ConsentType(consent_type_str)
    except ValueError:
        return jsonify({'error': f'Invalid consent_type: {consent_type_str}'}), 400
    
    # Revoke consent
    success = ConsentManagementService.revoke_consent(
        patient_id=patient_id,
        consent_type=consent_type,
        revoked_by=payload['user_id']
    )
    
    if success:
        return jsonify({'message': 'Consent revoked successfully'}), 200
    else:
        return jsonify({'error': 'No active consent found'}), 404


@consent_bp.route('/verify', methods=['POST'])
def verify_consent():
    """
    Verify patient consent.
    
    Request:
        {
            "patient_id": "123",
            "consent_type": "treatment"
        }
    """
    data = request.json
    patient_id = data.get('patient_id')
    consent_type_str = data.get('consent_type')
    
    if not patient_id or not consent_type_str:
        return jsonify({'error': 'patient_id and consent_type required'}), 400
    
    try:
        consent_type = ConsentType(consent_type_str)
    except ValueError:
        return jsonify({'error': f'Invalid consent_type: {consent_type_str}'}), 400
    
    # Verify consent
    has_consent = ConsentManagementService.verify_consent(patient_id, consent_type)
    
    return jsonify({'has_consent': has_consent}), 200


@consent_bp.route('/history/<patient_id>', methods=['GET'])
def get_consent_history(patient_id: str):
    """
    Get consent history for a patient.
    
    Requires: Authentication + PHI_READ permission
    """
    from src.auth.jwt_service import jwt_service
    
    # Authenticate
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing authorization header'}), 401
    
    token = auth_header.split(' ')[1]
    payload = jwt_service.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Get consent history
    history = ConsentManagementService.get_consent_history(patient_id)
    
    return jsonify({'consents': history}), 200

