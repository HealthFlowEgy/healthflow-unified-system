"""
Clinical Validation and Safety Service for HealthFlow AI
Implements safety checks, confidence thresholds, and pharmacist workflow
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Severity levels for validation flags"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ValidationFlagType(Enum):
    """Types of validation flags"""
    LOW_CONFIDENCE_OCR = "low_confidence_ocr"
    LOW_CONFIDENCE_NLP = "low_confidence_nlp"
    CRITICAL_MEDICATION = "critical_medication"
    UNUSUAL_DOSAGE = "unusual_dosage"
    DRUG_INTERACTION = "drug_interaction"
    CONTRAINDICATION = "contraindication"
    MISSING_REQUIRED_FIELD = "missing_required_field"
    ILLEGIBLE_HANDWRITING = "illegible_handwriting"
    DUPLICATE_PRESCRIPTION = "duplicate_prescription"


@dataclass
class ValidationFlag:
    """Represents a validation concern"""
    type: ValidationFlagType
    severity: ValidationSeverity
    message: str
    details: Dict
    requires_pharmacist_review: bool
    timestamp: datetime


@dataclass
class DosageRange:
    """Normal dosage range for a medication"""
    medication_name: str
    min_daily_dose: float
    max_daily_dose: float
    unit: str
    route: str  # oral, IV, topical, etc.


class ClinicalValidationService:
    """
    Clinical validation and safety checking service
    Implements multi-layer validation before prescription approval
    """
    
    # Confidence thresholds
    OCR_CONFIDENCE_THRESHOLD = 0.85
    NLP_CONFIDENCE_THRESHOLD = 0.80
    CRITICAL_MEDICATION_THRESHOLD = 0.95  # Higher threshold for critical meds
    
    # Critical medications requiring extra scrutiny
    CRITICAL_MEDICATIONS = [
        'warfarin', 'heparin', 'enoxaparin',  # Anticoagulants
        'insulin', 'glipizide', 'metformin',  # Diabetes
        'digoxin', 'amiodarone',  # Cardiac
        'chemotherapy', 'methotrexate',  # Cancer/Immunosuppressants
        'opioids', 'morphine', 'fentanyl',  # Opioids
        'lithium', 'clozapine'  # Psychiatric
    ]
    
    # High-alert medication classes
    HIGH_ALERT_CLASSES = [
        'anticoagulants', 'opioids', 'insulin',
        'chemotherapy', 'sedatives', 'neuromuscular_blockers'
    ]
    
    def __init__(self, dosage_database: Optional[Dict] = None):
        """
        Initialize clinical validation service
        
        Args:
            dosage_database: Database of normal dosage ranges
        """
        self.dosage_database = dosage_database or self._load_default_dosages()
        self.validation_rules = self._initialize_validation_rules()
    
    def validate_prescription(
        self,
        ocr_result: Dict,
        nlp_result: Dict,
        patient_context: Optional[Dict] = None
    ) -> Dict:
        """
        Comprehensive prescription validation
        
        Args:
            ocr_result: OCR extraction results with confidence scores
            nlp_result: NLP entity extraction results
            patient_context: Patient info (age, allergies, current meds)
        
        Returns:
            Validation result with flags and approval status
        """
        validation_flags = []
        
        # Layer 1: OCR Confidence Check
        ocr_flags = self._validate_ocr_confidence(ocr_result)
        validation_flags.extend(ocr_flags)
        
        # Layer 2: NLP Confidence Check
        nlp_flags = self._validate_nlp_confidence(nlp_result)
        validation_flags.extend(nlp_flags)
        
        # Layer 3: Critical Medication Check
        med_flags = self._validate_critical_medications(nlp_result)
        validation_flags.extend(med_flags)
        
        # Layer 4: Dosage Validation
        dosage_flags = self._validate_dosages(nlp_result)
        validation_flags.extend(dosage_flags)
        
        # Layer 5: Required Fields Check
        field_flags = self._validate_required_fields(nlp_result)
        validation_flags.extend(field_flags)
        
        # Layer 6: Drug Interactions (if patient context available)
        if patient_context:
            interaction_flags = self._check_drug_interactions(
                nlp_result,
                patient_context
            )
            validation_flags.extend(interaction_flags)
        
        # Determine overall status
        status = self._determine_validation_status(validation_flags)
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(validation_flags)
        
        result = {
            "status": status,
            "risk_score": risk_score,
            "flags": [self._flag_to_dict(f) for f in validation_flags],
            "requires_pharmacist_review": any(
                f.requires_pharmacist_review for f in validation_flags
            ),
            "auto_approved": status == "approved" and not validation_flags,
            "validation_timestamp": datetime.utcnow().isoformat(),
            "summary": self._generate_summary(validation_flags)
        }
        
        logger.info(
            f"Validation completed: {status}, "
            f"Risk score: {risk_score}, "
            f"Flags: {len(validation_flags)}"
        )
        
        return result
    
    def _validate_ocr_confidence(self, ocr_result: Dict) -> List[ValidationFlag]:
        """Check OCR confidence scores"""
        flags = []
        
        overall_confidence = ocr_result.get("confidence", 0.0)
        
        if overall_confidence < self.OCR_CONFIDENCE_THRESHOLD:
            flags.append(ValidationFlag(
                type=ValidationFlagType.LOW_CONFIDENCE_OCR,
                severity=ValidationSeverity.HIGH,
                message=f"OCR confidence {overall_confidence:.2f} below threshold",
                details={
                    "confidence": overall_confidence,
                    "threshold": self.OCR_CONFIDENCE_THRESHOLD,
                    "recommendation": "Manual verification required"
                },
                requires_pharmacist_review=True,
                timestamp=datetime.utcnow()
            ))
        
        # Check individual field confidence
        field_confidences = ocr_result.get("field_confidences", {})
        for field, confidence in field_confidences.items():
            if confidence < 0.70:  # Very low confidence
                flags.append(ValidationFlag(
                    type=ValidationFlagType.ILLEGIBLE_HANDWRITING,
                    severity=ValidationSeverity.HIGH,
                    message=f"Field '{field}' has very low confidence",
                    details={
                        "field": field,
                        "confidence": confidence,
                        "value": ocr_result.get(field, "N/A")
                    },
                    requires_pharmacist_review=True,
                    timestamp=datetime.utcnow()
                ))
        
        return flags
    
    def _validate_nlp_confidence(self, nlp_result: Dict) -> List[ValidationFlag]:
        """Check NLP entity extraction confidence"""
        flags = []
        
        entities = nlp_result.get("entities", [])
        
        for entity in entities:
            confidence = entity.get("confidence", 0.0)
            entity_type = entity.get("type")
            
            if confidence < self.NLP_CONFIDENCE_THRESHOLD:
                flags.append(ValidationFlag(
                    type=ValidationFlagType.LOW_CONFIDENCE_NLP,
                    severity=ValidationSeverity.MEDIUM,
                    message=f"Low confidence for {entity_type} extraction",
                    details={
                        "entity_type": entity_type,
                        "confidence": confidence,
                        "extracted_value": entity.get("value")
                    },
                    requires_pharmacist_review=True,
                    timestamp=datetime.utcnow()
                ))
        
        return flags
    
    def _validate_critical_medications(
        self,
        nlp_result: Dict
    ) -> List[ValidationFlag]:
        """Flag critical medications requiring extra scrutiny"""
        flags = []
        
        medications = nlp_result.get("medications", [])
        
        for med in medications:
            med_name = med.get("name", "").lower()
            
            # Check if critical medication
            is_critical = any(
                crit_med in med_name 
                for crit_med in self.CRITICAL_MEDICATIONS
            )
            
            if is_critical:
                confidence = med.get("confidence", 0.0)
                
                # Critical meds need higher confidence
                if confidence < self.CRITICAL_MEDICATION_THRESHOLD:
                    severity = ValidationSeverity.CRITICAL
                    requires_review = True
                else:
                    severity = ValidationSeverity.MEDIUM
                    requires_review = True  # Always review critical meds
                
                flags.append(ValidationFlag(
                    type=ValidationFlagType.CRITICAL_MEDICATION,
                    severity=severity,
                    message=f"Critical medication detected: {med_name}",
                    details={
                        "medication": med_name,
                        "confidence": confidence,
                        "dosage": med.get("dosage"),
                        "route": med.get("route"),
                        "reason": "High-alert medication requiring pharmacist verification"
                    },
                    requires_pharmacist_review=requires_review,
                    timestamp=datetime.utcnow()
                ))
        
        return flags
    
    def _validate_dosages(self, nlp_result: Dict) -> List[ValidationFlag]:
        """Validate medication dosages against normal ranges"""
        flags = []
        
        medications = nlp_result.get("medications", [])
        
        for med in medications:
            med_name = med.get("name", "").lower()
            dosage = med.get("dosage")
            
            if not dosage:
                flags.append(ValidationFlag(
                    type=ValidationFlagType.MISSING_REQUIRED_FIELD,
                    severity=ValidationSeverity.HIGH,
                    message=f"Missing dosage for {med_name}",
                    details={
                        "medication": med_name,
                        "missing_field": "dosage"
                    },
                    requires_pharmacist_review=True,
                    timestamp=datetime.utcnow()
                ))
                continue
            
            # Check against normal range
            if med_name in self.dosage_database:
                normal_range = self.dosage_database[med_name]
                dosage_value = self._extract_dosage_value(dosage)
                
                if dosage_value:
                    if (dosage_value < normal_range.min_daily_dose or 
                        dosage_value > normal_range.max_daily_dose):
                        
                        flags.append(ValidationFlag(
                            type=ValidationFlagType.UNUSUAL_DOSAGE,
                            severity=ValidationSeverity.HIGH,
                            message=f"Dosage outside normal range for {med_name}",
                            details={
                                "medication": med_name,
                                "prescribed_dose": dosage,
                                "normal_range": {
                                    "min": normal_range.min_daily_dose,
                                    "max": normal_range.max_daily_dose,
                                    "unit": normal_range.unit
                                },
                                "recommendation": "Verify dosage with prescriber"
                            },
                            requires_pharmacist_review=True,
                            timestamp=datetime.utcnow()
                        ))
        
        return flags
    
    def _validate_required_fields(self, nlp_result: Dict) -> List[ValidationFlag]:
        """Ensure all required prescription fields are present"""
        flags = []
        
        required_fields = [
            "patient_name",
            "medications",
            "prescriber_name",
            "date"
        ]
        
        for field in required_fields:
            if not nlp_result.get(field):
                flags.append(ValidationFlag(
                    type=ValidationFlagType.MISSING_REQUIRED_FIELD,
                    severity=ValidationSeverity.HIGH,
                    message=f"Missing required field: {field}",
                    details={
                        "missing_field": field,
                        "recommendation": "Contact prescriber for clarification"
                    },
                    requires_pharmacist_review=True,
                    timestamp=datetime.utcnow()
                ))
        
        return flags
    
    def _check_drug_interactions(
        self,
        nlp_result: Dict,
        patient_context: Dict
    ) -> List[ValidationFlag]:
        """Check for drug interactions with patient's current medications"""
        flags = []
        
        new_meds = [m.get("name") for m in nlp_result.get("medications", [])]
        current_meds = patient_context.get("current_medications", [])
        
        # This is simplified - in production, use comprehensive interaction database
        known_interactions = {
            ("warfarin", "aspirin"): "Increased bleeding risk",
            ("warfarin", "ibuprofen"): "Increased bleeding risk",
            ("lisinopril", "potassium"): "Hyperkalemia risk",
            ("metformin", "contrast_dye"): "Lactic acidosis risk"
        }
        
        for new_med in new_meds:
            for current_med in current_meds:
                interaction_key = tuple(sorted([new_med.lower(), current_med.lower()]))
                
                if interaction_key in known_interactions:
                    flags.append(ValidationFlag(
                        type=ValidationFlagType.DRUG_INTERACTION,
                        severity=ValidationSeverity.CRITICAL,
                        message=f"Drug interaction detected",
                        details={
                            "drug1": new_med,
                            "drug2": current_med,
                            "interaction": known_interactions[interaction_key],
                            "recommendation": "Consult with prescriber before dispensing"
                        },
                        requires_pharmacist_review=True,
                        timestamp=datetime.utcnow()
                    ))
        
        return flags
    
    def _determine_validation_status(
        self,
        flags: List[ValidationFlag]
    ) -> str:
        """Determine overall validation status"""
        if not flags:
            return "approved"
        
        # Check for critical flags
        has_critical = any(
            f.severity == ValidationSeverity.CRITICAL for f in flags
        )
        if has_critical:
            return "rejected"
        
        # Check if any flag requires review
        requires_review = any(f.requires_pharmacist_review for f in flags)
        if requires_review:
            return "requires_review"
        
        return "approved_with_warnings"
    
    def _calculate_risk_score(self, flags: List[ValidationFlag]) -> float:
        """Calculate risk score from 0-100"""
        if not flags:
            return 0.0
        
        severity_weights = {
            ValidationSeverity.LOW: 10,
            ValidationSeverity.MEDIUM: 25,
            ValidationSeverity.HIGH: 50,
            ValidationSeverity.CRITICAL: 100
        }
        
        total_score = sum(severity_weights[f.severity] for f in flags)
        
        # Cap at 100
        return min(total_score, 100.0)
    
    def _generate_summary(self, flags: List[ValidationFlag]) -> str:
        """Generate human-readable summary"""
        if not flags:
            return "Prescription validated successfully with no concerns"
        
        critical_count = sum(1 for f in flags if f.severity == ValidationSeverity.CRITICAL)
        high_count = sum(1 for f in flags if f.severity == ValidationSeverity.HIGH)
        
        summary_parts = []
        
        if critical_count:
            summary_parts.append(f"{critical_count} critical issue(s)")
        if high_count:
            summary_parts.append(f"{high_count} high-priority issue(s)")
        
        if summary_parts:
            return f"Validation flagged {', '.join(summary_parts)} - pharmacist review required"
        else:
            return f"{len(flags)} warning(s) detected - review recommended"
    
    def _flag_to_dict(self, flag: ValidationFlag) -> Dict:
        """Convert ValidationFlag to dictionary"""
        return {
            "type": flag.type.value,
            "severity": flag.severity.value,
            "message": flag.message,
            "details": flag.details,
            "requires_pharmacist_review": flag.requires_pharmacist_review,
            "timestamp": flag.timestamp.isoformat()
        }
    
    def _extract_dosage_value(self, dosage_str: str) -> Optional[float]:
        """Extract numeric dosage value from string"""
        import re
        
        match = re.search(r'(\d+(?:\.\d+)?)', dosage_str)
        if match:
            return float(match.group(1))
        return None
    
    def _load_default_dosages(self) -> Dict[str, DosageRange]:
        """Load default dosage ranges (simplified example)"""
        return {
            "metformin": DosageRange("metformin", 500, 2550, "mg", "oral"),
            "lisinopril": DosageRange("lisinopril", 2.5, 40, "mg", "oral"),
            "atorvastatin": DosageRange("atorvastatin", 10, 80, "mg", "oral"),
            "amoxicillin": DosageRange("amoxicillin", 250, 1000, "mg", "oral"),
            "warfarin": DosageRange("warfarin", 1, 20, "mg", "oral")
        }
    
    def _initialize_validation_rules(self) -> Dict:
        """Initialize validation rules"""
        return {
            "confidence_thresholds": {
                "ocr": self.OCR_CONFIDENCE_THRESHOLD,
                "nlp": self.NLP_CONFIDENCE_THRESHOLD,
                "critical_meds": self.CRITICAL_MEDICATION_THRESHOLD
            },
            "critical_medications": self.CRITICAL_MEDICATIONS,
            "high_alert_classes": self.HIGH_ALERT_CLASSES
        }


# Example usage
if __name__ == "__main__":
    validator = ClinicalValidationService()
    
    # Example prescription data
    ocr_result = {
        "confidence": 0.82,
        "text": "...",
        "field_confidences": {
            "medication": 0.91,
            "dosage": 0.75,
            "patient_name": 0.88
        }
    }
    
    nlp_result = {
        "medications": [
            {
                "name": "Warfarin",
                "dosage": "5mg daily",
                "confidence": 0.93
            }
        ],
        "patient_name": "John Doe",
        "prescriber_name": "Dr. Smith",
        "date": "2025-10-11"
    }
    
    patient_context = {
        "current_medications": ["aspirin"],
        "allergies": [],
        "age": 65
    }
    
    result = validator.validate_prescription(
        ocr_result,
        nlp_result,
        patient_context
    )
    
    print(f"Validation Status: {result['status']}")
    print(f"Risk Score: {result['risk_score']}")
    print(f"Requires Review: {result['requires_pharmacist_review']}")
    print(f"Flags: {len(result['flags'])}")