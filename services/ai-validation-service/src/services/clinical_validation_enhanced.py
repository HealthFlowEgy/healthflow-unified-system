"""
Enhanced Clinical Validation Service
Implements confidence thresholds, drug interactions, and safety checks
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests

from src.models.database import db
from src.models.prescription import Prescription

logger = logging.getLogger(__name__)


class ValidationConfig:
    """Configuration for clinical validation thresholds."""
    
    # Confidence thresholds
    OCR_CONFIDENCE_THRESHOLD = 0.85
    NLP_CONFIDENCE_THRESHOLD = 0.80
    
    # Critical medications requiring extra scrutiny
    CRITICAL_MEDICATIONS = [
        'warfarin', 'coumadin',
        'insulin', 'humulin', 'novolog',
        'methotrexate',
        'digoxin',
        'lithium',
        'phenytoin',
        'theophylline',
        'chemotherapy', 'cytotoxic',
        'opioid', 'oxycodone', 'hydrocodone', 'fentanyl', 'morphine'
    ]
    
    # High-risk patient conditions
    HIGH_RISK_CONDITIONS = [
        'pregnancy', 'pregnant',
        'pediatric', 'child', 'infant',
        'geriatric', 'elderly',
        'renal failure', 'kidney disease',
        'liver failure', 'hepatic',
        'immunocompromised'
    ]
    
    # Dosage limits (example - would be much more comprehensive in production)
    DOSAGE_LIMITS = {
        'warfarin': {'min': 1, 'max': 10, 'unit': 'mg'},
        'insulin': {'min': 1, 'max': 100, 'unit': 'units'},
        'methotrexate': {'min': 2.5, 'max': 25, 'unit': 'mg'},
        'digoxin': {'min': 0.0625, 'max': 0.25, 'unit': 'mg'},
    }


class ValidationFlag:
    """Represents a validation flag on a prescription."""
    
    def __init__(
        self,
        flag_type: str,
        severity: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.type = flag_type
        self.severity = severity  # LOW, MEDIUM, HIGH, CRITICAL
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self):
        return {
            'type': self.type,
            'severity': self.severity,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp.isoformat()
        }


class DrugInteractionService:
    """Service for checking drug-drug interactions."""
    
    def __init__(self):
        # In production, use FDA API, RxNav, DrugBank, or Micromedex
        self.api_url = "https://api.fda.gov/drug/label.json"
        self.cache = {}
    
    def check_interactions(self, medications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Check for drug-drug interactions.
        
        Args:
            medications: List of medication dictionaries with 'name' and 'dosage'
            
        Returns:
            List of interaction dictionaries
        """
        interactions = []
        
        # Check each medication pair
        for i, med1 in enumerate(medications):
            for med2 in medications[i+1:]:
                interaction = self._check_pair(med1['name'], med2['name'])
                if interaction:
                    interactions.append(interaction)
        
        return sorted(interactions, key=lambda x: self._severity_score(x['severity']), reverse=True)
    
    def _check_pair(self, drug1: str, drug2: str) -> Optional[Dict[str, Any]]:
        """Check interaction between two drugs."""
        # Check cache first
        cache_key = f"{drug1.lower()}:{drug2.lower()}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Known critical interactions (hardcoded for demo)
        critical_pairs = {
            ('warfarin', 'aspirin'): {
                'severity': 'SEVERE',
                'description': 'Increased risk of bleeding. Warfarin and aspirin both affect blood clotting.',
                'recommendation': 'Consider alternative antiplatelet therapy or adjust warfarin dose with close INR monitoring.'
            },
            ('warfarin', 'ibuprofen'): {
                'severity': 'SEVERE',
                'description': 'NSAIDs increase bleeding risk when combined with warfarin.',
                'recommendation': 'Avoid concurrent use. Use acetaminophen for pain relief instead.'
            },
            ('methotrexate', 'nsaid'): {
                'severity': 'SEVERE',
                'description': 'NSAIDs can increase methotrexate toxicity.',
                'recommendation': 'Avoid concurrent use or monitor methotrexate levels closely.'
            },
            ('lithium', 'nsaid'): {
                'severity': 'MODERATE',
                'description': 'NSAIDs can increase lithium levels.',
                'recommendation': 'Monitor lithium levels if concurrent use is necessary.'
            },
        }
        
        # Check if this pair is in our known interactions
        for (d1, d2), interaction_info in critical_pairs.items():
            if (d1 in drug1.lower() and d2 in drug2.lower()) or \
               (d2 in drug1.lower() and d1 in drug2.lower()):
                result = {
                    'drug1': drug1,
                    'drug2': drug2,
                    **interaction_info
                }
                self.cache[cache_key] = result
                return result
        
        # No interaction found
        self.cache[cache_key] = None
        return None
    
    def _severity_score(self, severity: str) -> int:
        """Convert severity to numeric score for sorting."""
        scores = {
            'SEVERE': 4,
            'MODERATE': 3,
            'MINOR': 2,
            'UNKNOWN': 1
        }
        return scores.get(severity, 0)


class ClinicalValidationService:
    """Enhanced clinical validation service with safety checks."""
    
    def __init__(self):
        self.drug_interaction_service = DrugInteractionService()
    
    def validate_prescription(
        self,
        prescription: Prescription,
        ocr_result: Dict[str, Any],
        nlp_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive clinical validation.
        
        Args:
            prescription: Prescription model instance
            ocr_result: OCR extraction results with confidence scores
            nlp_result: NLP analysis results
            
        Returns:
            Validation result dictionary
        """
        flags = []
        requires_review = False
        
        # 1. Check OCR confidence
        ocr_flags = self._check_ocr_confidence(ocr_result)
        flags.extend(ocr_flags)
        if ocr_flags:
            requires_review = True
        
        # 2. Check for critical medications
        critical_med_flags = self._check_critical_medications(nlp_result)
        flags.extend(critical_med_flags)
        if critical_med_flags:
            requires_review = True
        
        # 3. Check dosage ranges
        dosage_flags = self._check_dosages(nlp_result)
        flags.extend(dosage_flags)
        if any(f.severity in ['HIGH', 'CRITICAL'] for f in dosage_flags):
            requires_review = True
        
        # 4. Check drug interactions
        interaction_flags = self._check_drug_interactions(nlp_result)
        flags.extend(interaction_flags)
        if any(f.severity in ['SEVERE', 'MODERATE'] for f in interaction_flags):
            requires_review = True
        
        # 5. Check high-risk patient conditions
        patient_flags = self._check_patient_risk(prescription, nlp_result)
        flags.extend(patient_flags)
        if patient_flags:
            requires_review = True
        
        # 6. Check for incomplete information
        completeness_flags = self._check_completeness(nlp_result)
        flags.extend(completeness_flags)
        if completeness_flags:
            requires_review = True
        
        # Update prescription status
        if requires_review:
            prescription.status = 'REQUIRES_MANUAL_REVIEW'
            prescription.validation_flags = [f.to_dict() for f in flags]
            self._notify_pharmacist(prescription, flags)
        else:
            prescription.status = 'AUTO_APPROVED'
            prescription.validation_flags = []
        
        prescription.validated_at = datetime.utcnow()
        prescription.save()
        
        return {
            'requires_review': requires_review,
            'flags': [f.to_dict() for f in flags],
            'auto_approved': not requires_review,
            'status': prescription.status
        }
    
    def _check_ocr_confidence(self, ocr_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check OCR confidence scores."""
        flags = []
        
        overall_confidence = ocr_result.get('confidence', 0)
        if overall_confidence < ValidationConfig.OCR_CONFIDENCE_THRESHOLD:
            flags.append(ValidationFlag(
                flag_type='LOW_OCR_CONFIDENCE',
                severity='HIGH',
                message=f'OCR confidence {overall_confidence:.1%} below threshold {ValidationConfig.OCR_CONFIDENCE_THRESHOLD:.1%}',
                details={'confidence': overall_confidence, 'threshold': ValidationConfig.OCR_CONFIDENCE_THRESHOLD}
            ))
        
        # Check field-level confidence
        field_confidences = ocr_result.get('field_confidences', {})
        for field, confidence in field_confidences.items():
            if confidence < 0.70:  # Lower threshold for individual fields
                flags.append(ValidationFlag(
                    flag_type='LOW_FIELD_CONFIDENCE',
                    severity='MEDIUM',
                    message=f'Low confidence for field "{field}": {confidence:.1%}',
                    details={'field': field, 'confidence': confidence}
                ))
        
        return flags
    
    def _check_critical_medications(self, nlp_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check for critical medications."""
        flags = []
        
        medications = nlp_result.get('medications', [])
        for med in medications:
            med_name = med.get('name', '').lower()
            
            # Check if this is a critical medication
            if any(critical in med_name for critical in ValidationConfig.CRITICAL_MEDICATIONS):
                flags.append(ValidationFlag(
                    flag_type='CRITICAL_MEDICATION',
                    severity='HIGH',
                    message=f'Critical medication detected: {med.get("name")} - requires pharmacist verification',
                    details={'medication': med.get('name'), 'dosage': med.get('dosage')}
                ))
        
        return flags
    
    def _check_dosages(self, nlp_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check medication dosages against safe ranges."""
        flags = []
        
        medications = nlp_result.get('medications', [])
        for med in medications:
            med_name = med.get('name', '').lower()
            dosage = med.get('dosage', {})
            
            # Check if we have dosage limits for this medication
            for drug, limits in ValidationConfig.DOSAGE_LIMITS.items():
                if drug in med_name:
                    dose_value = dosage.get('value', 0)
                    
                    if dose_value < limits['min'] or dose_value > limits['max']:
                        flags.append(ValidationFlag(
                            flag_type='UNUSUAL_DOSAGE',
                            severity='HIGH',
                            message=f'Dosage {dose_value}{limits["unit"]} outside normal range for {med.get("name")}',
                            details={
                                'medication': med.get('name'),
                                'prescribed_dose': f'{dose_value}{limits["unit"]}',
                                'safe_range': f'{limits["min"]}-{limits["max"]}{limits["unit"]}'
                            }
                        ))
        
        return flags
    
    def _check_drug_interactions(self, nlp_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check for drug-drug interactions."""
        flags = []
        
        medications = nlp_result.get('medications', [])
        if len(medications) > 1:
            interactions = self.drug_interaction_service.check_interactions(medications)
            
            for interaction in interactions:
                severity_map = {
                    'SEVERE': 'CRITICAL',
                    'MODERATE': 'HIGH',
                    'MINOR': 'MEDIUM'
                }
                
                flags.append(ValidationFlag(
                    flag_type='DRUG_INTERACTION',
                    severity=severity_map.get(interaction['severity'], 'MEDIUM'),
                    message=f'Drug interaction: {interaction["drug1"]} + {interaction["drug2"]}',
                    details=interaction
                ))
        
        return flags
    
    def _check_patient_risk(self, prescription: Prescription, nlp_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check for high-risk patient conditions."""
        flags = []
        
        # Check patient notes/conditions
        patient_notes = getattr(prescription, 'patient_notes', '').lower()
        diagnosis = nlp_result.get('diagnosis', '').lower()
        
        for condition in ValidationConfig.HIGH_RISK_CONDITIONS:
            if condition in patient_notes or condition in diagnosis:
                flags.append(ValidationFlag(
                    flag_type='HIGH_RISK_PATIENT',
                    severity='HIGH',
                    message=f'High-risk patient condition detected: {condition}',
                    details={'condition': condition}
                ))
        
        return flags
    
    def _check_completeness(self, nlp_result: Dict[str, Any]) -> List[ValidationFlag]:
        """Check for missing required information."""
        flags = []
        
        required_fields = ['patient_name', 'medications', 'prescriber_name']
        for field in required_fields:
            if not nlp_result.get(field):
                flags.append(ValidationFlag(
                    flag_type='MISSING_INFORMATION',
                    severity='HIGH',
                    message=f'Required field missing: {field}',
                    details={'field': field}
                ))
        
        # Check if medications have dosage information
        medications = nlp_result.get('medications', [])
        for med in medications:
            if not med.get('dosage'):
                flags.append(ValidationFlag(
                    flag_type='MISSING_DOSAGE',
                    severity='HIGH',
                    message=f'Dosage missing for medication: {med.get("name")}',
                    details={'medication': med.get('name')}
                ))
        
        return flags
    
    def _notify_pharmacist(self, prescription: Prescription, flags: List[ValidationFlag]):
        """Send notification to pharmacist about flagged prescription."""
        # In production, this would send email/SMS/push notification
        logger.warning(
            f"Prescription {prescription.id} requires manual review. "
            f"Flags: {', '.join(f.type for f in flags)}"
        )
        
        # TODO: Implement actual notification service
        # notification_service.send(
        #     to=prescription.assigned_pharmacist,
        #     subject=f"Prescription Review Required: {prescription.id}",
        #     body=f"Prescription flagged with {len(flags)} issues requiring review"
        # )

