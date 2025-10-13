"""
Clinical Validation Service

Implements pharmacist review workflow, safety checks, and clinical decision support.
Ensures all AI predictions are validated by licensed healthcare professionals.

Author: HealthFlow Clinical Team
Date: 2025-10-14
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
try:
    from models.database import db
    from models.prescription import Prescription, ValidationStatus
    from services.audit_service import AuditService, AuditAction, AuditSeverity
except ImportError:
    from src.models.database import db
    from src.models.prescription import Prescription, ValidationStatus
    from src.services.audit_service import AuditService, AuditAction, AuditSeverity
import logging

logger = logging.getLogger(__name__)


class ReviewPriority(str, Enum):
    """Priority levels for pharmacist review"""
    CRITICAL = "CRITICAL"      # Immediate review required (e.g., critical medications)
    HIGH = "HIGH"              # Review within 1 hour
    MEDIUM = "MEDIUM"          # Review within 4 hours
    LOW = "LOW"                # Review within 24 hours
    ROUTINE = "ROUTINE"        # Review at convenience


class ReviewStatus(str, Enum):
    """Status of pharmacist review"""
    PENDING = "PENDING"              # Waiting for review
    IN_REVIEW = "IN_REVIEW"          # Currently being reviewed
    APPROVED = "APPROVED"            # Approved by pharmacist
    APPROVED_WITH_CHANGES = "APPROVED_WITH_CHANGES"  # Approved with corrections
    REJECTED = "REJECTED"            # Rejected by pharmacist
    ESCALATED = "ESCALATED"          # Escalated to senior pharmacist/doctor


class ValidationFlag(str, Enum):
    """Types of validation flags"""
    LOW_CONFIDENCE_OCR = "LOW_CONFIDENCE_OCR"
    CRITICAL_MEDICATION = "CRITICAL_MEDICATION"
    UNUSUAL_DOSAGE = "UNUSUAL_DOSAGE"
    DRUG_INTERACTION = "DRUG_INTERACTION"
    ALLERGY_CONFLICT = "ALLERGY_CONFLICT"
    DUPLICATE_THERAPY = "DUPLICATE_THERAPY"
    CONTRAINDICATION = "CONTRAINDICATION"
    OFF_LABEL_USE = "OFF_LABEL_USE"
    MISSING_INFORMATION = "MISSING_INFORMATION"
    AGE_INAPPROPRIATE = "AGE_INAPPROPRIATE"


class SafetySeverity(str, Enum):
    """Severity of safety concerns"""
    LIFE_THREATENING = "LIFE_THREATENING"
    SEVERE = "SEVERE"
    MODERATE = "MODERATE"
    MILD = "MILD"
    INFORMATIONAL = "INFORMATIONAL"


@dataclass
class ClinicalFlag:
    """Clinical validation flag"""
    flag_type: ValidationFlag
    severity: SafetySeverity
    description: str
    recommendation: str
    requires_review: bool
    blocking: bool  # If True, cannot approve without addressing


class PharmacistReview(db.Model):
    """
    Pharmacist review of AI-processed prescription
    
    Tracks the review process, corrections, and approval decisions
    """
    __tablename__ = 'pharmacist_reviews'
    
    id = Column(Integer, primary_key=True)
    
    # Related prescription
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=False)
    prescription = relationship('Prescription', backref='reviews')
    
    # Review metadata
    review_id = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default=ReviewStatus.PENDING.value)
    priority = Column(String(20), nullable=False, default=ReviewPriority.MEDIUM.value)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Pharmacist information
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    reviewed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    pharmacist_license = Column(String(50), nullable=True)
    
    # Review details
    confidence_scores = Column(JSON, nullable=True)  # OCR and NLP confidence
    validation_flags = Column(JSON, nullable=True)   # List of ClinicalFlag objects
    
    # Corrections made by pharmacist
    original_data = Column(JSON, nullable=True)      # Original AI extraction
    corrected_data = Column(JSON, nullable=True)     # Pharmacist corrections
    correction_notes = Column(Text, nullable=True)
    
    # Review outcome
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    requires_doctor_confirmation = Column(Boolean, default=False)
    
    # Quality metrics
    time_to_review_seconds = Column(Integer, nullable=True)
    num_corrections = Column(Integer, default=0)
    accuracy_score = Column(Float, nullable=True)  # How accurate was AI
    
    def __repr__(self):
        return f"<PharmacistReview {self.review_id}: {self.status}>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'review_id': self.review_id,
            'prescription_id': self.prescription_id,
            'status': self.status,
            'priority': self.priority,
            'created_at': self.created_at.isoformat(),
            'assigned_to': self.assigned_to,
            'reviewed_by': self.reviewed_by,
            'validation_flags': self.validation_flags,
            'num_corrections': self.num_corrections,
            'time_to_review_seconds': self.time_to_review_seconds,
            'approval_notes': self.approval_notes,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class SafetyAlert(db.Model):
    """
    Safety alerts and adverse event tracking
    
    Records potential safety issues and adverse events
    """
    __tablename__ = 'safety_alerts'
    
    id = Column(Integer, primary_key=True)
    alert_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Related entities
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=True)
    review_id = Column(Integer, ForeignKey('pharmacist_reviews.id'), nullable=True)
    
    # Alert details
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    
    # Detection
    detected_by = Column(String(50), nullable=False)  # 'AI', 'PHARMACIST', 'DOCTOR'
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Resolution
    status = Column(String(20), nullable=False, default='OPEN')
    resolved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # FDA reporting
    requires_fda_report = Column(Boolean, default=False)
    fda_report_filed = Column(Boolean, default=False)
    fda_report_date = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<SafetyAlert {self.alert_id}: {self.severity}>"


class ClinicalValidationService:
    """
    Service for clinical validation and safety checks
    """
    
    # Confidence thresholds
    CONFIDENCE_THRESHOLD_HIGH = 0.95
    CONFIDENCE_THRESHOLD_MEDIUM = 0.85
    CONFIDENCE_THRESHOLD_LOW = 0.75
    
    # Critical medications requiring immediate review
    CRITICAL_MEDICATIONS = [
        'warfarin', 'heparin', 'insulin', 'chemotherapy', 'methotrexate',
        'digoxin', 'lithium', 'phenytoin', 'carbamazepine', 'opioids'
    ]
    
    # High-alert drug classes
    HIGH_ALERT_CLASSES = [
        'anticoagulants', 'antineoplastic', 'insulins', 'opioids',
        'neuromuscular_blocking_agents', 'sedatives', 'immunosuppressants'
    ]
    
    def __init__(self):
        self.audit_service = AuditService()
        self.logger = logging.getLogger(__name__)
    
    def create_review(
        self,
        prescription: Prescription,
        confidence_scores: Dict[str, float],
        extracted_data: Dict[str, Any]
    ) -> PharmacistReview:
        """
        Create a pharmacist review for a prescription
        
        Args:
            prescription: Prescription to review
            confidence_scores: OCR and NLP confidence scores
            extracted_data: AI-extracted data
        
        Returns:
            Created PharmacistReview instance
        """
        # Generate validation flags
        validation_flags = self._generate_validation_flags(
            prescription, confidence_scores, extracted_data
        )
        
        # Determine priority
        priority = self._determine_priority(validation_flags, extracted_data)
        
        # Create review
        review = PharmacistReview(
            review_id=self._generate_review_id(),
            prescription_id=prescription.id,
            status=ReviewStatus.PENDING.value,
            priority=priority.value,
            confidence_scores=confidence_scores,
            validation_flags=[flag.__dict__ for flag in validation_flags],
            original_data=extracted_data
        )
        
        db.session.add(review)
        db.session.commit()
        
        # Log creation
        self.audit_service.log_event(
            action=AuditAction.CREATE,
            resource_type='PharmacistReview',
            resource_id=review.review_id,
            description=f"Review created with priority {priority.value}",
            metadata={'prescription_id': prescription.id, 'priority': priority.value}
        )
        
        # Auto-assign if critical
        if priority == ReviewPriority.CRITICAL:
            self._auto_assign_critical_review(review)
        
        return review
    
    def _generate_validation_flags(
        self,
        prescription: Prescription,
        confidence_scores: Dict[str, float],
        extracted_data: Dict[str, Any]
    ) -> List[ClinicalFlag]:
        """Generate clinical validation flags based on AI output"""
        flags = []
        
        # Check 1: Low confidence OCR
        ocr_confidence = confidence_scores.get('ocr_confidence', 1.0)
        if ocr_confidence < self.CONFIDENCE_THRESHOLD_MEDIUM:
            severity = SafetySeverity.SEVERE if ocr_confidence < self.CONFIDENCE_THRESHOLD_LOW else SafetySeverity.MODERATE
            flags.append(ClinicalFlag(
                flag_type=ValidationFlag.LOW_CONFIDENCE_OCR,
                severity=severity,
                description=f"Low OCR confidence: {ocr_confidence:.2%}",
                recommendation="Manually verify all extracted text against original image",
                requires_review=True,
                blocking=ocr_confidence < self.CONFIDENCE_THRESHOLD_LOW
            ))
        
        # Check 2: Critical medications
        medications = extracted_data.get('medications', [])
        for med in medications:
            med_name = med.get('name', '').lower()
            if any(critical in med_name for critical in self.CRITICAL_MEDICATIONS):
                flags.append(ClinicalFlag(
                    flag_type=ValidationFlag.CRITICAL_MEDICATION,
                    severity=SafetySeverity.SEVERE,
                    description=f"Critical medication detected: {med.get('name')}",
                    recommendation="Verify dosage, frequency, and patient suitability",
                    requires_review=True,
                    blocking=True
                ))
        
        # Check 3: Unusual dosages
        for med in medications:
            if self._is_unusual_dosage(med):
                flags.append(ClinicalFlag(
                    flag_type=ValidationFlag.UNUSUAL_DOSAGE,
                    severity=SafetySeverity.MODERATE,
                    description=f"Unusual dosage for {med.get('name')}: {med.get('dosage')}",
                    recommendation="Verify dosage is correct and appropriate for patient",
                    requires_review=True,
                    blocking=False
                ))
        
        # Check 4: Drug interactions
        interactions = self._check_drug_interactions(medications)
        for interaction in interactions:
            flags.append(ClinicalFlag(
                flag_type=ValidationFlag.DRUG_INTERACTION,
                severity=interaction['severity'],
                description=interaction['description'],
                recommendation=interaction['recommendation'],
                requires_review=True,
                blocking=interaction['severity'] == SafetySeverity.LIFE_THREATENING
            ))
        
        # Check 5: Missing information
        missing_fields = self._check_missing_information(extracted_data)
        if missing_fields:
            flags.append(ClinicalFlag(
                flag_type=ValidationFlag.MISSING_INFORMATION,
                severity=SafetySeverity.MODERATE,
                description=f"Missing required information: {', '.join(missing_fields)}",
                recommendation="Request complete prescription information",
                requires_review=True,
                blocking=True
            ))
        
        # Check 6: Age-inappropriate medications
        patient_age = extracted_data.get('patient_age')
        if patient_age:
            age_flags = self._check_age_appropriateness(medications, patient_age)
            flags.extend(age_flags)
        
        return flags
    
    def _determine_priority(
        self,
        flags: List[ClinicalFlag],
        extracted_data: Dict[str, Any]
    ) -> ReviewPriority:
        """Determine review priority based on flags and data"""
        
        # Critical if any life-threatening or blocking flags
        if any(flag.severity == SafetySeverity.LIFE_THREATENING for flag in flags):
            return ReviewPriority.CRITICAL
        
        if any(flag.blocking for flag in flags):
            return ReviewPriority.CRITICAL
        
        # High if critical medications or severe issues
        has_critical_med = any(
            flag.flag_type == ValidationFlag.CRITICAL_MEDICATION 
            for flag in flags
        )
        has_severe = any(
            flag.severity == SafetySeverity.SEVERE 
            for flag in flags
        )
        
        if has_critical_med or has_severe:
            return ReviewPriority.HIGH
        
        # Medium if multiple moderate flags
        moderate_flags = [
            flag for flag in flags 
            if flag.severity == SafetySeverity.MODERATE
        ]
        if len(moderate_flags) >= 2:
            return ReviewPriority.MEDIUM
        
        # Low if any flags
        if flags:
            return ReviewPriority.LOW
        
        return ReviewPriority.ROUTINE
    
    def _is_unusual_dosage(self, medication: Dict[str, Any]) -> bool:
        """Check if dosage is outside normal ranges"""
        # This would integrate with a drug database
        # Simplified implementation for demo
        dosage_str = str(medication.get('dosage', '')).lower()
        
        # Check for extremely high numbers
        import re
        numbers = re.findall(r'\d+', dosage_str)
        if numbers:
            for num in numbers:
                if int(num) > 1000:  # Suspiciously high dosage
                    return True
        
        return False
    
    def _check_drug_interactions(
        self,
        medications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Check for drug-drug interactions
        
        In production, this would integrate with:
        - FDA Drug Interaction API
        - First Databank (FDB)
        - Micromedex
        - Lexicomp
        """
        interactions = []
        
        # Simplified interaction checking
        # In production, use comprehensive drug interaction database
        known_interactions = {
            ('warfarin', 'aspirin'): {
                'severity': SafetySeverity.SEVERE,
                'description': 'Warfarin + Aspirin: Increased bleeding risk',
                'recommendation': 'Consider alternative antiplatelet or monitor INR closely'
            },
            ('metformin', 'contrast'): {
                'severity': SafetySeverity.SEVERE,
                'description': 'Metformin + IV contrast: Risk of lactic acidosis',
                'recommendation': 'Discontinue metformin 48 hours before contrast'
            }
        }
        
        # Check all medication pairs
        for i, med1 in enumerate(medications):
            for med2 in medications[i+1:]:
                name1 = med1.get('name', '').lower()
                name2 = med2.get('name', '').lower()
                
                # Check both orders
                for pair, interaction in known_interactions.items():
                    if (pair[0] in name1 and pair[1] in name2) or \
                       (pair[1] in name1 and pair[0] in name2):
                        interactions.append(interaction)
        
        return interactions
    
    def _check_missing_information(
        self,
        extracted_data: Dict[str, Any]
    ) -> List[str]:
        """Check for missing required information"""
        missing = []
        
        required_fields = [
            'patient_name',
            'patient_dob',
            'prescriber_name',
            'prescriber_license',
            'date_prescribed'
        ]
        
        for field in required_fields:
            if not extracted_data.get(field):
                missing.append(field.replace('_', ' ').title())
        
        # Check medications have required info
        medications = extracted_data.get('medications', [])
        for i, med in enumerate(medications):
            if not med.get('name'):
                missing.append(f"Medication #{i+1} name")
            if not med.get('dosage'):
                missing.append(f"Medication #{i+1} dosage")
            if not med.get('frequency'):
                missing.append(f"Medication #{i+1} frequency")
        
        return missing
    
    def _check_age_appropriateness(
        self,
        medications: List[Dict[str, Any]],
        patient_age: int
    ) -> List[ClinicalFlag]:
        """Check if medications are appropriate for patient age"""
        flags = []
        
        # Pediatric concerns (< 18 years)
        if patient_age < 18:
            pediatric_contraindicated = ['aspirin', 'tetracycline', 'fluoroquinolone']
            
            for med in medications:
                med_name = med.get('name', '').lower()
                for contraindicated in pediatric_contraindicated:
                    if contraindicated in med_name:
                        flags.append(ClinicalFlag(
                            flag_type=ValidationFlag.AGE_INAPPROPRIATE,
                            severity=SafetySeverity.SEVERE,
                            description=f"{med.get('name')} generally contraindicated in pediatric patients",
                            recommendation="Verify appropriateness and consider alternatives",
                            requires_review=True,
                            blocking=True
                        ))
        
        # Geriatric concerns (> 65 years)
        elif patient_age > 65:
            beers_criteria = ['benzodiazepine', 'anticholinergic', 'nsaid']
            
            for med in medications:
                med_name = med.get('name', '').lower()
                for potentially_inappropriate in beers_criteria:
                    if potentially_inappropriate in med_name:
                        flags.append(ClinicalFlag(
                            flag_type=ValidationFlag.AGE_INAPPROPRIATE,
                            severity=SafetySeverity.MODERATE,
                            description=f"{med.get('name')} on Beers Criteria - potentially inappropriate in elderly",
                            recommendation="Consider alternatives with better safety profile in elderly",
                            requires_review=True,
                            blocking=False
                        ))
        
        return flags
    
    def assign_review(
        self,
        review: PharmacistReview,
        pharmacist_id: int
    ) -> PharmacistReview:
        """Assign review to a pharmacist"""
        review.assigned_to = pharmacist_id
        review.assigned_at = datetime.utcnow()
        review.status = ReviewStatus.IN_REVIEW.value
        review.started_at = datetime.utcnow()
        
        db.session.commit()
        
        self.audit_service.log_event(
            action=AuditAction.UPDATE,
            user_id=pharmacist_id,
            resource_type='PharmacistReview',
            resource_id=review.review_id,
            description=f"Review assigned to pharmacist {pharmacist_id}"
        )
        
        return review
    
    def submit_review(
        self,
        review: PharmacistReview,
        pharmacist_id: int,
        status: ReviewStatus,
        corrected_data: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
        rejection_reason: Optional[str] = None
    ) -> PharmacistReview:
        """
        Submit pharmacist review decision
        
        Args:
            review: Review to submit
            pharmacist_id: Pharmacist submitting review
            status: Review decision
            corrected_data: Corrected data (if any)
            notes: Approval/review notes
            rejection_reason: Reason for rejection (if rejected)
        """
        review.reviewed_by = pharmacist_id
        review.status = status.value
        review.completed_at = datetime.utcnow()
        
        # Calculate time to review
        if review.started_at:
            time_diff = review.completed_at - review.started_at
            review.time_to_review_seconds = int(time_diff.total_seconds())
        
        # Handle corrections
        if corrected_data:
            review.corrected_data = corrected_data
            review.num_corrections = self._count_corrections(
                review.original_data,
                corrected_data
            )
            review.accuracy_score = self._calculate_accuracy(
                review.original_data,
                corrected_data
            )
        else:
            review.num_corrections = 0
            review.accuracy_score = 1.0
        
        if notes:
            review.approval_notes = notes
        
        if rejection_reason:
            review.rejection_reason = rejection_reason
        
        db.session.commit()
        
        # Log review completion
        self.audit_service.log_event(
            action=AuditAction.UPDATE,
            user_id=pharmacist_id,
            resource_type='PharmacistReview',
            resource_id=review.review_id,
            phi_accessed=True,
            phi_fields=['prescription_data'],
            description=f"Review completed with status: {status.value}"
        )
        
        # Update prescription status
        if status == ReviewStatus.APPROVED:
            review.prescription.validation_status = ValidationStatus.VALID
        elif status == ReviewStatus.REJECTED:
            review.prescription.validation_status = ValidationStatus.INVALID
        
        db.session.commit()
        
        return review
    
    def create_safety_alert(
        self,
        prescription_id: int,
        alert_type: str,
        severity: SafetySeverity,
        description: str,
        detected_by: str,
        requires_fda_report: bool = False
    ) -> SafetyAlert:
        """Create a safety alert"""
        alert = SafetyAlert(
            alert_id=self._generate_alert_id(),
            prescription_id=prescription_id,
            alert_type=alert_type,
            severity=severity.value,
            description=description,
            detected_by=detected_by,
            requires_fda_report=requires_fda_report
        )
        
        db.session.add(alert)
        db.session.commit()
        
        # Log critical alerts
        if severity in [SafetySeverity.LIFE_THREATENING, SafetySeverity.SEVERE]:
            self.audit_service.log_event(
                action=AuditAction.CREATE,
                severity=AuditSeverity.CRITICAL,
                resource_type='SafetyAlert',
                resource_id=alert.alert_id,
                description=f"Safety alert created: {description}"
            )
        
        return alert
    
    def get_pending_reviews(
        self,
        pharmacist_id: Optional[int] = None,
        priority: Optional[ReviewPriority] = None,
        limit: int = 50
    ) -> List[PharmacistReview]:
        """Get pending reviews for pharmacist queue"""
        query = PharmacistReview.query.filter_by(
            status=ReviewStatus.PENDING.value
        )
        
        if pharmacist_id:
            query = query.filter_by(assigned_to=pharmacist_id)
        
        if priority:
            query = query.filter_by(priority=priority.value)
        
        # Order by priority and creation time
        priority_order = {
            ReviewPriority.CRITICAL.value: 0,
            ReviewPriority.HIGH.value: 1,
            ReviewPriority.MEDIUM.value: 2,
            ReviewPriority.LOW.value: 3,
            ReviewPriority.ROUTINE.value: 4
        }
        
        return query.order_by(
            db.case(priority_order, value=PharmacistReview.priority),
            PharmacistReview.created_at
        ).limit(limit).all()
    
    def get_review_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get clinical validation metrics"""
        query = PharmacistReview.query
        
        if start_date:
            query = query.filter(PharmacistReview.created_at >= start_date)
        if end_date:
            query = query.filter(PharmacistReview.created_at <= end_date)
        
        reviews = query.all()
        
        if not reviews:
            return {}
        
        completed_reviews = [r for r in reviews if r.completed_at]
        
        return {
            'total_reviews': len(reviews),
            'completed_reviews': len(completed_reviews),
            'pending_reviews': len([r for r in reviews if r.status == ReviewStatus.PENDING.value]),
            'approval_rate': len([r for r in completed_reviews if r.status == ReviewStatus.APPROVED.value]) / len(completed_reviews) if completed_reviews else 0,
            'avg_time_to_review_minutes': sum(r.time_to_review_seconds for r in completed_reviews if r.time_to_review_seconds) / len(completed_reviews) / 60 if completed_reviews else 0,
            'avg_corrections': sum(r.num_corrections for r in completed_reviews) / len(completed_reviews) if completed_reviews else 0,
            'avg_accuracy': sum(r.accuracy_score for r in completed_reviews if r.accuracy_score) / len([r for r in completed_reviews if r.accuracy_score]) if completed_reviews else 0,
            'critical_reviews': len([r for r in reviews if r.priority == ReviewPriority.CRITICAL.value]),
            'safety_alerts': SafetyAlert.query.filter(
                SafetyAlert.detected_at >= start_date if start_date else True,
                SafetyAlert.detected_at <= end_date if end_date else True
            ).count()
        }
    
    def _count_corrections(
        self,
        original: Dict[str, Any],
        corrected: Dict[str, Any]
    ) -> int:
        """Count number of corrections made"""
        corrections = 0
        
        for key in corrected.keys():
            if key in original and original[key] != corrected[key]:
                corrections += 1
        
        return corrections
    
    def _calculate_accuracy(
        self,
        original: Dict[str, Any],
        corrected: Dict[str, Any]
    ) -> float:
        """Calculate AI accuracy score"""
        if not original or not corrected:
            return 1.0
        
        total_fields = len(corrected)
        if total_fields == 0:
            return 1.0
        
        correct_fields = sum(
            1 for key in corrected.keys()
            if key in original and original[key] == corrected[key]
        )
        
        return correct_fields / total_fields
    
    def _generate_review_id(self) -> str:
        """Generate unique review ID"""
        import uuid
        return f"REV-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    def _generate_alert_id(self) -> str:
        """Generate unique alert ID"""
        import uuid
        return f"ALR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    def _auto_assign_critical_review(self, review: PharmacistReview):
        """Auto-assign critical reviews to on-call pharmacist"""
        # In production, integrate with on-call schedule
        # For now, just set high priority
        self.logger.warning(
            f"Critical review {review.review_id} requires immediate attention",
            extra={'review_id': review.review_id, 'priority': 'CRITICAL'}
        )