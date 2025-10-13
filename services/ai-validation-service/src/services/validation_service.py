import json
import logging
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
from dataclasses import dataclass
import re

from src.models.prescription import (
    Prescription, Medication, ValidationResult, ValidationStatus
)
from models.database import db
from src.services.snowstorm_service import SnowstormService, SnowstormDrugInteraction

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class DrugInteraction:
    """Data class for drug interaction information"""
    drug1: str
    drug2: str
    severity: str  # mild, moderate, severe, contraindicated
    description: str
    clinical_recommendation: str
    mechanism: Optional[str] = None
    management: Optional[str] = None

@dataclass
class ValidationIssue:
    """Data class for validation issues"""
    issue_type: str
    severity: str
    description: str
    affected_fields: List[str]
    recommendations: List[str]
    confidence: float

class DrugInteractionChecker:
    """Drug interaction checking service using Snowstorm SNOMED CT server"""
    
    def __init__(self, snowstorm_url: str = "https://snowstorm.app.evidium.com"):
        self.snowstorm_service = SnowstormService(snowstorm_url)
        logger.info(f"Initialized DrugInteractionChecker with Snowstorm server: {snowstorm_url}")
    
    def normalize_drug_name(self, drug_name: str) -> str:
        """Normalize drug name for comparison"""
        return drug_name.lower().strip().replace(' ', '')
    
    def check_interactions(self, medications: List[Medication]) -> List[DrugInteraction]:
        """Check for drug interactions among medications using Snowstorm"""
        interactions = []
        
        if len(medications) < 2:
            return interactions
        
        try:
            # Extract drug names from medications
            drug_names = [med.drug_name for med in medications]
            
            # Use Snowstorm service to check interactions
            snowstorm_interactions = self.snowstorm_service.check_drug_drug_interactions(drug_names)
            
            # Convert Snowstorm interactions to our format
            for snow_interaction in snowstorm_interactions:
                interaction = DrugInteraction(
                    drug1=snow_interaction.drug1_name,
                    drug2=snow_interaction.drug2_name,
                    severity=snow_interaction.severity,
                    description=snow_interaction.description,
                    clinical_recommendation=snow_interaction.clinical_recommendation,
                    mechanism=snow_interaction.mechanism,
                    management=snow_interaction.management
                )
                interactions.append(interaction)
                
                logger.info(f"Found drug interaction via Snowstorm: {interaction.drug1} + {interaction.drug2} ({interaction.severity})")
        
        except Exception as e:
            logger.error(f"Error checking drug interactions via Snowstorm: {str(e)}")
            # Fallback to basic interaction checking if Snowstorm fails
            interactions.extend(self._fallback_interaction_check(medications))
        
        return interactions
    
    def _fallback_interaction_check(self, medications: List[Medication]) -> List[DrugInteraction]:
        """Fallback interaction checking when Snowstorm is unavailable"""
        interactions = []
        
        # Basic fallback interactions (simplified)
        fallback_interactions = {
            ('warfarin', 'aspirin'): DrugInteraction(
                drug1='warfarin',
                drug2='aspirin',
                severity='severe',
                description='Increased risk of bleeding',
                clinical_recommendation='Avoid concurrent use or monitor closely',
                mechanism='Both drugs affect blood clotting',
                management='Consider alternative antiplatelet therapy'
            ),
            ('lisinopril', 'ibuprofen'): DrugInteraction(
                drug1='lisinopril',
                drug2='ibuprofen',
                severity='moderate',
                description='Reduced antihypertensive effect, kidney function risk',
                clinical_recommendation='Monitor blood pressure and kidney function',
                mechanism='NSAIDs reduce prostaglandin-mediated vasodilation',
                management='Use lowest effective NSAID dose'
            )
        }
        
        for i, med1 in enumerate(medications):
            for med2 in medications[i+1:]:
                drug1_norm = self.normalize_drug_name(med1.drug_name)
                drug2_norm = self.normalize_drug_name(med2.drug_name)
                
                # Check both directions
                interaction_key1 = (drug1_norm, drug2_norm)
                interaction_key2 = (drug2_norm, drug1_norm)
                
                if interaction_key1 in fallback_interactions:
                    interactions.append(fallback_interactions[interaction_key1])
                elif interaction_key2 in fallback_interactions:
                    interactions.append(fallback_interactions[interaction_key2])
        
        if interactions:
            logger.warning(f"Using fallback interaction checking, found {len(interactions)} interactions")
        
        return interactions

class DosageValidator:
    """Dosage validation service"""
    
    def __init__(self):
        # Standard dosage ranges (simplified for demo)
        self.dosage_ranges = {
            'lisinopril': {'min': 2.5, 'max': 40, 'unit': 'mg', 'frequency': 'daily'},
            'metformin': {'min': 500, 'max': 2000, 'unit': 'mg', 'frequency': 'daily'},
            'atorvastatin': {'min': 10, 'max': 80, 'unit': 'mg', 'frequency': 'daily'},
            'simvastatin': {'min': 5, 'max': 40, 'unit': 'mg', 'frequency': 'daily'},
            'aspirin': {'min': 75, 'max': 325, 'unit': 'mg', 'frequency': 'daily'},
            'ibuprofen': {'min': 200, 'max': 800, 'unit': 'mg', 'frequency': 'per dose'}
        }
    
    def extract_dosage_amount(self, dosage_str: str) -> Optional[float]:
        """Extract numeric dosage amount from string"""
        if not dosage_str:
            return None
        
        # Look for patterns like "10mg", "2.5 mg", "500 milligrams"
        patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:mg|milligrams?)',
            r'(\d+(?:\.\d+)?)\s*(?:mcg|micrograms?)',
            r'(\d+(?:\.\d+)?)\s*(?:g|grams?)',
            r'(\d+(?:\.\d+)?)\s*(?:tablets?|caps?|capsules?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, dosage_str.lower())
            if match:
                return float(match.group(1))
        
        return None
    
    def validate_dosage(self, medication: Medication) -> List[ValidationIssue]:
        """Validate medication dosage"""
        issues = []
        drug_name = medication.drug_name.lower().strip()
        
        if drug_name not in self.dosage_ranges:
            # Unknown drug - can't validate dosage
            return issues
        
        dosage_range = self.dosage_ranges[drug_name]
        dosage_amount = self.extract_dosage_amount(medication.dosage or '')
        
        if dosage_amount is None:
            issues.append(ValidationIssue(
                issue_type='missing_dosage',
                severity='high',
                description=f'Dosage amount not specified for {medication.drug_name}',
                affected_fields=['dosage'],
                recommendations=['Specify exact dosage amount'],
                confidence=0.9
            ))
            return issues
        
        # Check if dosage is within normal range
        if dosage_amount < dosage_range['min']:
            issues.append(ValidationIssue(
                issue_type='dosage_too_low',
                severity='medium',
                description=f'Dosage {dosage_amount}{dosage_range["unit"]} is below typical range for {medication.drug_name}',
                affected_fields=['dosage'],
                recommendations=[f'Consider increasing to at least {dosage_range["min"]}{dosage_range["unit"]}'],
                confidence=0.8
            ))
        elif dosage_amount > dosage_range['max']:
            issues.append(ValidationIssue(
                issue_type='dosage_too_high',
                severity='high',
                description=f'Dosage {dosage_amount}{dosage_range["unit"]} exceeds maximum recommended for {medication.drug_name}',
                affected_fields=['dosage'],
                recommendations=[f'Consider reducing to maximum {dosage_range["max"]}{dosage_range["unit"]}'],
                confidence=0.9
            ))
        
        return issues

class CompletenessValidator:
    """Prescription completeness validation service"""
    
    def __init__(self):
        self.required_fields = {
            'prescription': ['patient_name', 'prescriber_name', 'prescription_date'],
            'medication': ['drug_name', 'dosage', 'frequency', 'quantity']
        }
        
        self.recommended_fields = {
            'prescription': ['patient_address', 'prescriber_license'],
            'medication': ['route', 'duration', 'instructions']
        }
    
    def validate_prescription_completeness(self, prescription: Prescription) -> List[ValidationIssue]:
        """Validate prescription completeness"""
        issues = []
        
        # Check required prescription fields
        for field in self.required_fields['prescription']:
            value = getattr(prescription, field, None)
            if not value:
                issues.append(ValidationIssue(
                    issue_type='missing_required_field',
                    severity='high',
                    description=f'Required field {field} is missing',
                    affected_fields=[field],
                    recommendations=[f'Provide {field.replace("_", " ")}'],
                    confidence=1.0
                ))
        
        # Check recommended prescription fields
        for field in self.recommended_fields['prescription']:
            value = getattr(prescription, field, None)
            if not value:
                issues.append(ValidationIssue(
                    issue_type='missing_recommended_field',
                    severity='low',
                    description=f'Recommended field {field} is missing',
                    affected_fields=[field],
                    recommendations=[f'Consider providing {field.replace("_", " ")}'],
                    confidence=0.7
                ))
        
        return issues
    
    def validate_medication_completeness(self, medication: Medication) -> List[ValidationIssue]:
        """Validate medication completeness"""
        issues = []
        
        # Check required medication fields
        for field in self.required_fields['medication']:
            value = getattr(medication, field, None)
            if not value:
                issues.append(ValidationIssue(
                    issue_type='missing_required_field',
                    severity='high',
                    description=f'Required field {field} is missing for {medication.drug_name}',
                    affected_fields=[field],
                    recommendations=[f'Provide {field.replace("_", " ")} for {medication.drug_name}'],
                    confidence=1.0
                ))
        
        # Check recommended medication fields
        for field in self.recommended_fields['medication']:
            value = getattr(medication, field, None)
            if not value:
                issues.append(ValidationIssue(
                    issue_type='missing_recommended_field',
                    severity='low',
                    description=f'Recommended field {field} is missing for {medication.drug_name}',
                    affected_fields=[field],
                    recommendations=[f'Consider providing {field.replace("_", " ")} for {medication.drug_name}'],
                    confidence=0.7
                ))
        
        return issues

class ValidationService:
    """Comprehensive prescription validation service"""
    
    def __init__(self):
        self.interaction_checker = DrugInteractionChecker()
        self.dosage_validator = DosageValidator()
        self.completeness_validator = CompletenessValidator()
        logger.info("Validation Service initialized")
    
    def validate_prescription(self, prescription_id: int) -> Dict:
        """Perform comprehensive prescription validation"""
        try:
            start_time = datetime.now()
            
            # Get prescription from database
            prescription = Prescription.query.get(prescription_id)
            if not prescription:
                raise ValueError(f"Prescription {prescription_id} not found")
            
            # Clear existing validation results
            ValidationResult.query.filter_by(prescription_id=prescription_id).delete()
            
            all_issues = []
            validation_results = []
            
            # 1. Completeness validation
            completeness_issues = self.completeness_validator.validate_prescription_completeness(prescription)
            all_issues.extend(completeness_issues)
            
            # 2. Medication-specific validation
            medications = prescription.medications
            for medication in medications:
                # Completeness validation for each medication
                med_completeness_issues = self.completeness_validator.validate_medication_completeness(medication)
                all_issues.extend(med_completeness_issues)
                
                # Dosage validation
                dosage_issues = self.dosage_validator.validate_dosage(medication)
                all_issues.extend(dosage_issues)
            
            # 3. Drug interaction checking
            if len(medications) > 1:
                interactions = self.interaction_checker.check_interactions(medications)
                
                for interaction in interactions:
                    issue = ValidationIssue(
                        issue_type='drug_interaction',
                        severity=interaction.severity,
                        description=interaction.description,
                        affected_fields=['medications'],
                        recommendations=[interaction.clinical_recommendation],
                        confidence=0.9
                    )
                    all_issues.append(issue)
                    
                    # Create validation result for interaction
                    validation_result = ValidationResult(
                        prescription_id=prescription_id,
                        validation_type='drug_interaction',
                        status=ValidationStatus.REQUIRES_REVIEW if interaction.severity in ['severe', 'contraindicated'] else ValidationStatus.VALID,
                        confidence=0.9,
                        issue_type='drug_interaction',
                        severity=interaction.severity,
                        description=interaction.description,
                        affected_fields=json.dumps(['medications']),
                        recommendations=json.dumps([interaction.clinical_recommendation]),
                        drug1=interaction.drug1,
                        drug2=interaction.drug2,
                        interaction_type=interaction.severity,
                        clinical_recommendation=interaction.clinical_recommendation,
                        validator_version='1.0.0'
                    )
                    validation_results.append(validation_result)
            
            # 4. Create validation results for other issues
            for issue in all_issues:
                if issue.issue_type != 'drug_interaction':  # Already handled above
                    status = ValidationStatus.INVALID if issue.severity == 'high' else ValidationStatus.REQUIRES_REVIEW if issue.severity == 'medium' else ValidationStatus.VALID
                    
                    validation_result = ValidationResult(
                        prescription_id=prescription_id,
                        validation_type=issue.issue_type,
                        status=status,
                        confidence=issue.confidence,
                        issue_type=issue.issue_type,
                        severity=issue.severity,
                        description=issue.description,
                        affected_fields=json.dumps(issue.affected_fields),
                        recommendations=json.dumps(issue.recommendations),
                        validator_version='1.0.0'
                    )
                    validation_results.append(validation_result)
            
            # Save validation results to database
            for result in validation_results:
                db.session.add(result)
            
            # Determine overall validation status
            if any(result.status == ValidationStatus.INVALID for result in validation_results):
                overall_status = ValidationStatus.INVALID
            elif any(result.status == ValidationStatus.REQUIRES_REVIEW for result in validation_results):
                overall_status = ValidationStatus.REQUIRES_REVIEW
            else:
                overall_status = ValidationStatus.VALID
            
            # Update prescription validation status
            prescription.validation_status = overall_status
            prescription.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Prepare response
            response = {
                'prescription_id': prescription.prescription_id,
                'validation_status': overall_status.value,
                'total_issues': len(all_issues),
                'high_severity_issues': len([i for i in all_issues if i.severity == 'high']),
                'medium_severity_issues': len([i for i in all_issues if i.severity == 'medium']),
                'low_severity_issues': len([i for i in all_issues if i.severity == 'low']),
                'drug_interactions': len([i for i in all_issues if i.issue_type == 'drug_interaction']),
                'processing_time': round(processing_time, 3),
                'validation_results': [
                    {
                        'validation_type': result.validation_type,
                        'status': result.status.value,
                        'severity': result.severity,
                        'description': result.description,
                        'recommendations': json.loads(result.recommendations) if result.recommendations else [],
                        'confidence': result.confidence
                    }
                    for result in validation_results
                ],
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"Prescription validation completed: {prescription.prescription_id} - {overall_status.value}")
            return response
            
        except Exception as e:
            logger.error(f"Error validating prescription {prescription_id}: {str(e)}")
            return {
                'error': str(e),
                'prescription_id': prescription_id if 'prescription_id' in locals() else None,
                'validation_status': 'failed',
                'timestamp': datetime.now().isoformat()
            }
    
    def get_validation_summary(self, prescription_id: int) -> Dict:
        """Get validation summary for a prescription"""
        try:
            prescription = Prescription.query.get(prescription_id)
            if not prescription:
                raise ValueError(f"Prescription {prescription_id} not found")
            
            validation_results = ValidationResult.query.filter_by(prescription_id=prescription_id).all()
            
            summary = {
                'prescription_id': prescription.prescription_id,
                'validation_status': prescription.validation_status.value if prescription.validation_status else 'pending',
                'total_validations': len(validation_results),
                'issues_by_severity': {
                    'high': len([r for r in validation_results if r.severity == 'high']),
                    'medium': len([r for r in validation_results if r.severity == 'medium']),
                    'low': len([r for r in validation_results if r.severity == 'low'])
                },
                'issues_by_type': {},
                'drug_interactions': [],
                'recommendations': []
            }
            
            # Group by issue type
            for result in validation_results:
                if result.issue_type not in summary['issues_by_type']:
                    summary['issues_by_type'][result.issue_type] = 0
                summary['issues_by_type'][result.issue_type] += 1
                
                # Collect drug interactions
                if result.validation_type == 'drug_interaction':
                    summary['drug_interactions'].append({
                        'drug1': result.drug1,
                        'drug2': result.drug2,
                        'severity': result.severity,
                        'description': result.description,
                        'recommendation': result.clinical_recommendation
                    })
                
                # Collect recommendations
                if result.recommendations:
                    recommendations = json.loads(result.recommendations)
                    summary['recommendations'].extend(recommendations)
            
            # Remove duplicate recommendations
            summary['recommendations'] = list(set(summary['recommendations']))
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting validation summary for prescription {prescription_id}: {str(e)}")
            return {
                'error': str(e),
                'prescription_id': prescription_id
            }

# Convenience function for external use
def validate_prescription(prescription_id: int) -> Dict:
    """Validate prescription using the validation service"""
    validation_service = ValidationService()
    return validation_service.validate_prescription(prescription_id)

