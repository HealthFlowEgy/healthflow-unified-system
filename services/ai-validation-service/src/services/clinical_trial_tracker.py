"""
Clinical Trial Tracking System

Tracks validation accuracy, pharmacist feedback, and system performance
during clinical trials with real prescriptions.

This system enables:
- Trial participant management
- Accuracy measurement against gold standard
- Error categorization and analysis
- Statistical reporting for FDA/regulatory approval

Author: HealthFlow Clinical Research Team
Date: 2025-10-14
"""

from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from src.models.database import db
import logging
import statistics

logger = logging.getLogger(__name__)


class TrialPhase(str, Enum):
    """Clinical trial phases"""
    PILOT = "PILOT"                    # Initial small-scale testing
    VALIDATION = "VALIDATION"          # Main validation study
    POST_MARKET = "POST_MARKET"        # Post-deployment monitoring


class ParticipantRole(str, Enum):
    """Trial participant roles"""
    PHARMACIST = "PHARMACIST"
    DOCTOR = "DOCTOR"
    PHARMACY_TECH = "PHARMACY_TECH"


class ErrorCategory(str, Enum):
    """Categories of AI errors"""
    OCR_ERROR = "OCR_ERROR"                    # Incorrect text extraction
    MEDICATION_NAME_ERROR = "MEDICATION_NAME_ERROR"
    DOSAGE_ERROR = "DOSAGE_ERROR"
    FREQUENCY_ERROR = "FREQUENCY_ERROR"
    PATIENT_INFO_ERROR = "PATIENT_INFO_ERROR"
    PRESCRIBER_INFO_ERROR = "PRESCRIBER_INFO_ERROR"
    FALSE_POSITIVE = "FALSE_POSITIVE"          # Flagged issue that wasn't real
    FALSE_NEGATIVE = "FALSE_NEGATIVE"          # Missed actual issue


class ClinicalTrial(db.Model):
    """
    Clinical trial definition and metadata
    """
    __tablename__ = 'clinical_trials'
    
    id = Column(Integer, primary_key=True)
    trial_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Trial metadata
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    phase = Column(String(20), nullable=False)
    
    # Timeline
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    target_sample_size = Column(Integer, nullable=False)
    
    # Participant information
    participating_sites = Column(JSON, nullable=True)  # List of clinic/pharmacy names
    
    # Trial protocol
    inclusion_criteria = Column(JSON, nullable=True)
    exclusion_criteria = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, default='ACTIVE')  # ACTIVE, COMPLETED, PAUSED
    
    # IRB/Ethics
    irb_approval_number = Column(String(100), nullable=True)
    irb_approval_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ClinicalTrial {self.trial_id}: {self.name}>"


class TrialParticipant(db.Model):
    """
    Healthcare professionals participating in the trial
    """
    __tablename__ = 'trial_participants'
    
    id = Column(Integer, primary_key=True)
    participant_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Trial
    trial_id = Column(Integer, ForeignKey('clinical_trials.id'), nullable=False)
    trial = relationship('ClinicalTrial', backref='participants')
    
    # User
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Participant info
    role = Column(String(20), nullable=False)
    site_name = Column(String(200), nullable=True)
    years_experience = Column(Integer, nullable=True)
    
    # Participation
    enrolled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    consent_signed = Column(Boolean, nullable=False, default=False)
    consent_date = Column(DateTime, nullable=True)
    
    # Performance (calculated)
    prescriptions_reviewed = Column(Integer, default=0)
    avg_review_time_minutes = Column(Float, nullable=True)
    
    def __repr__(self):
        return f"<TrialParticipant {self.participant_id}>"


class TrialPrescription(db.Model):
    """
    Prescription used in clinical trial with gold standard data
    """
    __tablename__ = 'trial_prescriptions'
    
    id = Column(Integer, primary_key=True)
    trial_prescription_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Trial
    trial_id = Column(Integer, ForeignKey('clinical_trials.id'), nullable=False)
    trial = relationship('ClinicalTrial', backref='prescriptions')
    
    # Related prescription
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=False)
    prescription = relationship('Prescription')
    
    # Gold standard (manually verified truth)
    gold_standard_data = Column(JSON, nullable=False)  # The correct/true data
    gold_standard_verified_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    gold_standard_verified_at = Column(DateTime, nullable=True)
    
    # AI prediction
    ai_prediction = Column(JSON, nullable=True)
    ai_confidence_scores = Column(JSON, nullable=True)
    
    # Human review
    pharmacist_review = Column(JSON, nullable=True)
    reviewed_by = Column(Integer, ForeignKey('trial_participants.id'), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Accuracy metrics (calculated)
    overall_accuracy = Column(Float, nullable=True)
    field_accuracies = Column(JSON, nullable=True)  # Per-field accuracy scores
    
    # Error analysis
    errors = Column(JSON, nullable=True)  # List of errors with categories
    
    # Additional metadata
    prescription_complexity = Column(String(20), nullable=True)  # SIMPLE, MODERATE, COMPLEX
    handwriting_quality = Column(String(20), nullable=True)  # EXCELLENT, GOOD, FAIR, POOR
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<TrialPrescription {self.trial_prescription_id}>"


class ClinicalTrialService:
    """
    Service for managing clinical trials and calculating validation metrics
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def create_trial(
        self,
        name: str,
        phase: TrialPhase,
        start_date: datetime,
        target_sample_size: int,
        description: Optional[str] = None,
        irb_approval_number: Optional[str] = None
    ) -> ClinicalTrial:
        """Create a new clinical trial"""
        trial = ClinicalTrial(
            trial_id=self._generate_trial_id(),
            name=name,
            description=description,
            phase=phase.value,
            start_date=start_date,
            target_sample_size=target_sample_size,
            irb_approval_number=irb_approval_number,
            status='ACTIVE'
        )
        
        db.session.add(trial)
        db.session.commit()
        
        self.logger.info(f"Created clinical trial: {trial.trial_id}")
        return trial
    
    def enroll_participant(
        self,
        trial: ClinicalTrial,
        user_id: int,
        role: ParticipantRole,
        site_name: str,
        years_experience: int
    ) -> TrialParticipant:
        """Enroll a participant in the trial"""
        participant = TrialParticipant(
            participant_id=self._generate_participant_id(),
            trial_id=trial.id,
            user_id=user_id,
            role=role.value,
            site_name=site_name,
            years_experience=years_experience,
            consent_signed=True,
            consent_date=datetime.utcnow()
        )
        
        db.session.add(participant)
        db.session.commit()
        
        self.logger.info(f"Enrolled participant: {participant.participant_id} in trial {trial.trial_id}")
        return participant
    
    def add_trial_prescription(
        self,
        trial: ClinicalTrial,
        prescription_id: int,
        gold_standard_data: Dict[str, Any],
        verified_by: int,
        complexity: str = 'MODERATE',
        handwriting_quality: str = 'GOOD'
    ) -> TrialPrescription:
        """Add a prescription to the trial with gold standard data"""
        trial_prescription = TrialPrescription(
            trial_prescription_id=self._generate_trial_prescription_id(),
            trial_id=trial.id,
            prescription_id=prescription_id,
            gold_standard_data=gold_standard_data,
            gold_standard_verified_by=verified_by,
            gold_standard_verified_at=datetime.utcnow(),
            prescription_complexity=complexity,
            handwriting_quality=handwriting_quality
        )
        
        db.session.add(trial_prescription)
        db.session.commit()
        
        return trial_prescription
    
    def record_ai_prediction(
        self,
        trial_prescription: TrialPrescription,
        ai_prediction: Dict[str, Any],
        confidence_scores: Dict[str, float]
    ) -> TrialPrescription:
        """Record AI prediction for trial prescription"""
        trial_prescription.ai_prediction = ai_prediction
        trial_prescription.ai_confidence_scores = confidence_scores
        
        # Calculate accuracy
        accuracy, field_accuracies, errors = self._calculate_accuracy(
            trial_prescription.gold_standard_data,
            ai_prediction
        )
        
        trial_prescription.overall_accuracy = accuracy
        trial_prescription.field_accuracies = field_accuracies
        trial_prescription.errors = errors
        
        db.session.commit()
        
        return trial_prescription
    
    def _calculate_accuracy(
        self,
        gold_standard: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> Tuple[float, Dict[str, float], List[Dict[str, Any]]]:
        """
        Calculate accuracy metrics comparing prediction to gold standard
        
        Returns:
            - Overall accuracy (0-1)
            - Per-field accuracy dict
            - List of errors with categories
        """
        if not gold_standard or not prediction:
            return 0.0, {}, []
        
        field_accuracies = {}
        errors = []
        
        # Compare each field
        for field, gold_value in gold_standard.items():
            pred_value = prediction.get(field)
            
            if isinstance(gold_value, list) and isinstance(pred_value, list):
                # Compare lists (e.g., medications)
                field_acc = self._compare_lists(gold_value, pred_value, field, errors)
                field_accuracies[field] = field_acc
            else:
                # Compare simple values
                if gold_value == pred_value:
                    field_accuracies[field] = 1.0
                else:
                    field_accuracies[field] = 0.0
                    errors.append({
                        'field': field,
                        'category': self._categorize_error(field),
                        'gold_value': str(gold_value),
                        'predicted_value': str(pred_value),
                        'description': f"Incorrect {field}"
                    })
        
        # Calculate overall accuracy
        if field_accuracies:
            overall_accuracy = sum(field_accuracies.values()) / len(field_accuracies)
        else:
            overall_accuracy = 0.0
        
        return overall_accuracy, field_accuracies, errors
    
    def _compare_lists(
        self,
        gold_list: List[Any],
        pred_list: List[Any],
        field_name: str,
        errors: List[Dict]
    ) -> float:
        """Compare two lists (e.g., medication lists)"""
        if not gold_list:
            return 1.0 if not pred_list else 0.0
        
        # Simple comparison - check if all items match
        matches = 0
        total = len(gold_list)
        
        for i, gold_item in enumerate(gold_list):
            if i < len(pred_list):
                if isinstance(gold_item, dict) and isinstance(pred_list[i], dict):
                    # Compare dict items
                    item_matches = sum(
                        1 for k in gold_item.keys()
                        if gold_item.get(k) == pred_list[i].get(k)
                    )
                    item_accuracy = item_matches / len(gold_item) if gold_item else 0
                    
                    if item_accuracy < 1.0:
                        errors.append({
                            'field': f"{field_name}[{i}]",
                            'category': ErrorCategory.MEDICATION_NAME_ERROR.value,
                            'gold_value': str(gold_item),
                            'predicted_value': str(pred_list[i]),
                            'description': f"Incorrect medication #{i+1}"
                        })
                    else:
                        matches += 1
                elif gold_item == pred_list[i]:
                    matches += 1
            else:
                # Missing item
                errors.append({
                    'field': f"{field_name}[{i}]",
                    'category': ErrorCategory.FALSE_NEGATIVE.value,
                    'gold_value': str(gold_item),
                    'predicted_value': 'None',
                    'description': f"Missing item in {field_name}"
                })
        
        # Check for extra items
        if len(pred_list) > len(gold_list):
            for i in range(len(gold_list), len(pred_list)):
                errors.append({
                    'field': f"{field_name}[{i}]",
                    'category': ErrorCategory.FALSE_POSITIVE.value,
                    'gold_value': 'None',
                    'predicted_value': str(pred_list[i]),
                    'description': f"Extra item in {field_name}"
                })
        
        return matches / total if total > 0 else 0.0
    
    def _categorize_error(self, field_name: str) -> str:
        """Categorize error based on field name"""
        field_lower = field_name.lower()
        
        if 'medication' in field_lower or 'drug' in field_lower:
            return ErrorCategory.MEDICATION_NAME_ERROR.value
        elif 'dosage' in field_lower or 'dose' in field_lower:
            return ErrorCategory.DOSAGE_ERROR.value
        elif 'frequency' in field_lower or 'freq' in field_lower:
            return ErrorCategory.FREQUENCY_ERROR.value
        elif 'patient' in field_lower:
            return ErrorCategory.PATIENT_INFO_ERROR.value
        elif 'prescriber' in field_lower or 'doctor' in field_lower:
            return ErrorCategory.PRESCRIBER_INFO_ERROR.value
        else:
            return ErrorCategory.OCR_ERROR.value
    
    def get_trial_statistics(self, trial: ClinicalTrial) -> Dict[str, Any]:
        """Calculate comprehensive trial statistics"""
        trial_prescriptions = TrialPrescription.query.filter_by(
            trial_id=trial.id
        ).all()
        
        if not trial_prescriptions:
            return {
                'total_prescriptions': 0,
                'progress_percentage': 0
            }
        
        # Filter prescriptions with AI predictions
        prescriptions_with_predictions = [
            tp for tp in trial_prescriptions 
            if tp.ai_prediction is not None
        ]
        
        if not prescriptions_with_predictions:
            return {
                'total_prescriptions': len(trial_prescriptions),
                'progress_percentage': 0,
                'prescriptions_analyzed': 0
            }
        
        # Calculate metrics
        accuracies = [tp.overall_accuracy for tp in prescriptions_with_predictions if tp.overall_accuracy is not None]
        
        # Collect all errors
        all_errors = []
        for tp in prescriptions_with_predictions:
            if tp.errors:
                all_errors.extend(tp.errors)
        
        # Error category breakdown
        error_categories = {}
        for error in all_errors:
            category = error.get('category', 'UNKNOWN')
            error_categories[category] = error_categories.get(category, 0) + 1
        
        # Field-level accuracy
        field_accuracies = {}
        for tp in prescriptions_with_predictions:
            if tp.field_accuracies:
                for field, acc in tp.field_accuracies.items():
                    if field not in field_accuracies:
                        field_accuracies[field] = []
                    field_accuracies[field].append(acc)
        
        avg_field_accuracies = {
            field: statistics.mean(accs)
            for field, accs in field_accuracies.items()
        }
        
        # Confidence vs accuracy correlation
        confidence_scores = [
            tp.ai_confidence_scores.get('overall_confidence', 0)
            for tp in prescriptions_with_predictions
            if tp.ai_confidence_scores
        ]
        
        # Complexity analysis
        complexity_breakdown = {}
        for tp in trial_prescriptions:
            complexity = tp.prescription_complexity or 'UNKNOWN'
            if complexity not in complexity_breakdown:
                complexity_breakdown[complexity] = {'total': 0, 'accuracies': []}
            complexity_breakdown[complexity]['total'] += 1
            if tp.overall_accuracy is not None:
                complexity_breakdown[complexity]['accuracies'].append(tp.overall_accuracy)
        
        # Calculate averages for each complexity
        for complexity in complexity_breakdown:
            accs = complexity_breakdown[complexity]['accuracies']
            complexity_breakdown[complexity]['avg_accuracy'] = (
                statistics.mean(accs) if accs else 0
            )
        
        return {
            'trial_info': {
                'trial_id': trial.trial_id,
                'name': trial.name,
                'phase': trial.phase,
                'target_sample_size': trial.target_sample_size
            },
            'progress': {
                'total_prescriptions': len(trial_prescriptions),
                'prescriptions_analyzed': len(prescriptions_with_predictions),
                'progress_percentage': (len(prescriptions_with_predictions) / trial.target_sample_size * 100) if trial.target_sample_size > 0 else 0
            },
            'accuracy_metrics': {
                'mean_accuracy': statistics.mean(accuracies) if accuracies else 0,
                'median_accuracy': statistics.median(accuracies) if accuracies else 0,
                'std_dev_accuracy': statistics.stdev(accuracies) if len(accuracies) > 1 else 0,
                'min_accuracy': min(accuracies) if accuracies else 0,
                'max_accuracy': max(accuracies) if accuracies else 0,
                'prescriptions_above_95pct': sum(1 for a in accuracies if a >= 0.95),
                'prescriptions_above_90pct': sum(1 for a in accuracies if a >= 0.90),
                'prescriptions_below_80pct': sum(1 for a in accuracies if a < 0.80)
            },
            'field_level_accuracy': avg_field_accuracies,
            'error_analysis': {
                'total_errors': len(all_errors),
                'error_rate': len(all_errors) / len(prescriptions_with_predictions) if prescriptions_with_predictions else 0,
                'error_categories': error_categories,
                'most_common_error': max(error_categories.items(), key=lambda x: x[1])[0] if error_categories else None
            },
            'confidence_analysis': {
                'avg_confidence': statistics.mean(confidence_scores) if confidence_scores else 0,
                'confidence_range': (min(confidence_scores), max(confidence_scores)) if confidence_scores else (0, 0)
            },
            'complexity_analysis': complexity_breakdown,
            'regulatory_metrics': {
                'sensitivity': self._calculate_sensitivity(prescriptions_with_predictions),
                'specificity': self._calculate_specificity(prescriptions_with_predictions),
                'precision': self._calculate_precision(prescriptions_with_predictions),
                'f1_score': self._calculate_f1_score(prescriptions_with_predictions)
            }
        }
    
    def _calculate_sensitivity(self, prescriptions: List[TrialPrescription]) -> float:
        """Calculate sensitivity (true positive rate)"""
        true_positives = 0
        false_negatives = 0
        
        for tp in prescriptions:
            if tp.errors:
                for error in tp.errors:
                    if error.get('category') == ErrorCategory.FALSE_NEGATIVE.value:
                        false_negatives += 1
                    else:
                        true_positives += 1
        
        total = true_positives + false_negatives
        return true_positives / total if total > 0 else 0.0
    
    def _calculate_specificity(self, prescriptions: List[TrialPrescription]) -> float:
        """Calculate specificity (true negative rate)"""
        # Simplified calculation
        false_positives = sum(
            1 for tp in prescriptions if tp.errors
            for error in tp.errors
            if error.get('category') == ErrorCategory.FALSE_POSITIVE.value
        )
        
        total_fields = sum(
            len(tp.field_accuracies) if tp.field_accuracies else 0
            for tp in prescriptions
        )
        
        true_negatives = total_fields - false_positives
        return true_negatives / total_fields if total_fields > 0 else 0.0
    
    def _calculate_precision(self, prescriptions: List[TrialPrescription]) -> float:
        """Calculate precision (positive predictive value)"""
        true_positives = 0
        false_positives = 0
        
        for tp in prescriptions:
            if tp.errors:
                for error in tp.errors:
                    if error.get('category') == ErrorCategory.FALSE_POSITIVE.value:
                        false_positives += 1
                    else:
                        true_positives += 1
        
        total = true_positives + false_positives
        return true_positives / total if total > 0 else 0.0
    
    def _calculate_f1_score(self, prescriptions: List[TrialPrescription]) -> float:
        """Calculate F1 score (harmonic mean of precision and recall)"""
        precision = self._calculate_precision(prescriptions)
        sensitivity = self._calculate_sensitivity(prescriptions)
        
        if precision + sensitivity == 0:
            return 0.0
        
        return 2 * (precision * sensitivity) / (precision + sensitivity)
    
    def generate_regulatory_report(self, trial: ClinicalTrial) -> str:
        """Generate regulatory report for FDA submission"""
        stats = self.get_trial_statistics(trial)
        
        report = f"""
CLINICAL VALIDATION STUDY REPORT
{trial.name}
Trial ID: {trial.trial_id}
Phase: {trial.phase}
IRB Approval: {trial.irb_approval_number or 'N/A'}

STUDY DESIGN
-------------
Target Sample Size: {trial.target_sample_size}
Actual Sample Size: {stats['progress']['prescriptions_analyzed']}
Study Duration: {trial.start_date.strftime('%Y-%m-%d')} to {datetime.utcnow().strftime('%Y-%m-%d')}

PRIMARY ENDPOINTS
-----------------
Mean Overall Accuracy: {stats['accuracy_metrics']['mean_accuracy']:.2%}
Median Accuracy: {stats['accuracy_metrics']['median_accuracy']:.2%}
Standard Deviation: {stats['accuracy_metrics']['std_dev_accuracy']:.2%}

Prescriptions ≥95% Accuracy: {stats['accuracy_metrics']['prescriptions_above_95pct']} ({stats['accuracy_metrics']['prescriptions_above_95pct']/stats['progress']['prescriptions_analyzed']*100:.1f}%)
Prescriptions ≥90% Accuracy: {stats['accuracy_metrics']['prescriptions_above_90pct']} ({stats['accuracy_metrics']['prescriptions_above_90pct']/stats['progress']['prescriptions_analyzed']*100:.1f}%)

FIELD-LEVEL PERFORMANCE
-----------------------
"""
        for field, accuracy in stats['field_level_accuracy'].items():
            report += f"{field}: {accuracy:.2%}\n"
        
        report += f"""
ERROR ANALYSIS
--------------
Total Errors: {stats['error_analysis']['total_errors']}
Average Errors per Prescription: {stats['error_analysis']['error_rate']:.2f}

Error Categories:
"""
        for category, count in stats['error_analysis']['error_categories'].items():
            report += f"  {category}: {count}\n"
        
        report += f"""
STATISTICAL METRICS
-------------------
Sensitivity (Recall): {stats['regulatory_metrics']['sensitivity']:.2%}
Specificity: {stats['regulatory_metrics']['specificity']:.2%}
Precision: {stats['regulatory_metrics']['precision']:.2%}
F1 Score: {stats['regulatory_metrics']['f1_score']:.2%}

COMPLEXITY ANALYSIS
-------------------
"""
        for complexity, data in stats['complexity_analysis'].items():
            report += f"{complexity}: {data['total']} prescriptions, Avg Accuracy: {data['avg_accuracy']:.2%}\n"
        
        report += f"""
CONCLUSION
----------
The AI system demonstrated {'acceptable' if stats['accuracy_metrics']['mean_accuracy'] >= 0.95 else 'needs improvement'} accuracy for clinical deployment.

Statistical significance: {'Achieved' if stats['progress']['prescriptions_analyzed'] >= 1000 else 'Pending - continue enrollment'}

Report Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
"""
        
        return report
    
    def export_trial_data(self, trial: ClinicalTrial) -> Dict[str, Any]:
        """Export complete trial data for analysis"""
        trial_prescriptions = TrialPrescription.query.filter_by(
            trial_id=trial.id
        ).all()
        
        return {
            'trial_metadata': {
                'trial_id': trial.trial_id,
                'name': trial.name,
                'phase': trial.phase,
                'start_date': trial.start_date.isoformat(),
                'target_sample_size': trial.target_sample_size,
                'irb_approval': trial.irb_approval_number
            },
            'prescriptions': [
                {
                    'trial_prescription_id': tp.trial_prescription_id,
                    'prescription_id': tp.prescription_id,
                    'gold_standard': tp.gold_standard_data,
                    'ai_prediction': tp.ai_prediction,
                    'confidence_scores': tp.ai_confidence_scores,
                    'overall_accuracy': tp.overall_accuracy,
                    'field_accuracies': tp.field_accuracies,
                    'errors': tp.errors,
                    'complexity': tp.prescription_complexity,
                    'handwriting_quality': tp.handwriting_quality,
                    'created_at': tp.created_at.isoformat()
                }
                for tp in trial_prescriptions
            ],
            'statistics': self.get_trial_statistics(trial)
        }
    
    def _generate_trial_id(self) -> str:
        """Generate unique trial ID"""
        import uuid
        return f"TRIAL-{datetime.utcnow().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    def _generate_participant_id(self) -> str:
        """Generate unique participant ID"""
        import uuid
        return f"PART-{str(uuid.uuid4())[:8].upper()}"
    
    def _generate_trial_prescription_id(self) -> str:
        """Generate unique trial prescription ID"""
        import uuid
        return f"TRX-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"


# ============================================================================
# API Routes for Clinical Trial Management
# ============================================================================

from flask import Blueprint, request, jsonify
from src.services.auth_service import require_auth, require_role

trial_bp = Blueprint('trials', __name__, url_prefix='/api/trials')
trial_service = ClinicalTrialService()


@trial_bp.route('/', methods=['POST'])
@require_auth
@require_role(['admin', 'clinical_researcher'])
def create_trial():
    """Create a new clinical trial"""
    data = request.get_json()
    
    trial = trial_service.create_trial(
        name=data['name'],
        phase=TrialPhase(data['phase']),
        start_date=datetime.fromisoformat(data['start_date']),
        target_sample_size=data['target_sample_size'],
        description=data.get('description'),
        irb_approval_number=data.get('irb_approval_number')
    )
    
    return jsonify({
        'status': 'success',
        'data': {
            'trial_id': trial.trial_id,
            'name': trial.name,
            'phase': trial.phase
        }
    }), 201


@trial_bp.route('/<trial_id>/statistics', methods=['GET'])
@require_auth
@require_role(['admin', 'clinical_researcher', 'auditor'])
def get_trial_statistics(trial_id: str):
    """Get trial statistics"""
    trial = ClinicalTrial.query.filter_by(trial_id=trial_id).first()
    
    if not trial:
        return jsonify({'status': 'error', 'message': 'Trial not found'}), 404
    
    stats = trial_service.get_trial_statistics(trial)
    
    return jsonify({
        'status': 'success',
        'data': stats
    }), 200


@trial_bp.route('/<trial_id>/report', methods=['GET'])
@require_auth
@require_role(['admin', 'clinical_researcher'])
def generate_report(trial_id: str):
    """Generate regulatory report"""
    trial = ClinicalTrial.query.filter_by(trial_id=trial_id).first()
    
    if not trial:
        return jsonify({'status': 'error', 'message': 'Trial not found'}), 404
    
    report = trial_service.generate_regulatory_report(trial)
    
    return jsonify({
        'status': 'success',
        'data': {
            'report': report,
            'generated_at': datetime.utcnow().isoformat()
        }
    }), 200


@trial_bp.route('/<trial_id>/export', methods=['GET'])
@require_auth
@require_role(['admin', 'clinical_researcher'])
def export_trial_data(trial_id: str):
    """Export complete trial data"""
    trial = ClinicalTrial.query.filter_by(trial_id=trial_id).first()
    
    if not trial:
        return jsonify({'status': 'error', 'message': 'Trial not found'}), 404
    
    data = trial_service.export_trial_data(trial)
    
    return jsonify({
        'status': 'success',
        'data': data
    }), 200


@trial_bp.route('/<trial_id>/participants', methods=['POST'])
@require_auth
@require_role(['admin', 'clinical_researcher'])
def enroll_participant(trial_id: str):
    """Enroll a participant in trial"""
    trial = ClinicalTrial.query.filter_by(trial_id=trial_id).first()
    
    if not trial:
        return jsonify({'status': 'error', 'message': 'Trial not found'}), 404
    
    data = request.get_json()
    
    participant = trial_service.enroll_participant(
        trial=trial,
        user_id=data['user_id'],
        role=ParticipantRole(data['role']),
        site_name=data['site_name'],
        years_experience=data['years_experience']
    )
    
    return jsonify({
        'status': 'success',
        'data': {
            'participant_id': participant.participant_id,
            'enrolled_at': participant.enrolled_at.isoformat()
        }
    }), 201


@trial_bp.route('/active', methods=['GET'])
@require_auth
def get_active_trials():
    """Get all active trials"""
    trials = ClinicalTrial.query.filter_by(status='ACTIVE').all()
    
    return jsonify({
        'status': 'success',
        'data': {
            'trials': [
                {
                    'trial_id': t.trial_id,
                    'name': t.name,
                    'phase': t.phase,
                    'start_date': t.start_date.isoformat(),
                    'target_sample_size': t.target_sample_size,
                    'current_enrollment': TrialPrescription.query.filter_by(trial_id=t.id).count()
                }
                for t in trials
            ]
        }
    }), 200


# ============================================================================
# Example Usage Script
# ============================================================================

def example_clinical_trial_workflow():
    """
    Example workflow for running a clinical trial
    """
    from src.models.user import User
    
    # Step 1: Create trial
    trial_service = ClinicalTrialService()
    
    trial = trial_service.create_trial(
        name="HealthFlow Validation Study - Phase II",
        phase=TrialPhase.VALIDATION,
        start_date=datetime.utcnow(),
        target_sample_size=1000,
        description="Multi-site validation of AI prescription validation system",
        irb_approval_number="IRB-2025-HF-001"
    )
    
    print(f"Created trial: {trial.trial_id}")
    
    # Step 2: Enroll participants
    pharmacist = User.query.filter_by(role='pharmacist').first()
    
    participant = trial_service.enroll_participant(
        trial=trial,
        user_id=pharmacist.id,
        role=ParticipantRole.PHARMACIST,
        site_name="Memorial Hospital Pharmacy",
        years_experience=8
    )
    
    print(f"Enrolled participant: {participant.participant_id}")
    
    # Step 3: Add prescriptions with gold standard
    prescription = Prescription.query.first()
    
    gold_standard_data = {
        'patient_name': 'John Doe',
        'patient_dob': '1975-05-15',
        'medications': [
            {
                'name': 'Metformin',
                'dosage': '500mg',
                'frequency': 'twice daily',
                'duration': '30 days'
            }
        ],
        'prescriber_name': 'Dr. Jane Smith',
        'prescriber_license': 'MD12345',
        'date_prescribed': '2025-10-14'
    }
    
    trial_prescription = trial_service.add_trial_prescription(
        trial=trial,
        prescription_id=prescription.id,
        gold_standard_data=gold_standard_data,
        verified_by=pharmacist.id,
        complexity='MODERATE',
        handwriting_quality='GOOD'
    )
    
    print(f"Added trial prescription: {trial_prescription.trial_prescription_id}")
    
    # Step 4: Record AI prediction
    ai_prediction = {
        'patient_name': 'John Doe',
        'patient_dob': '1975-05-15',
        'medications': [
            {
                'name': 'Metformin',
                'dosage': '500mg',
                'frequency': 'twice daily',
                'duration': '30 days'
            }
        ],
        'prescriber_name': 'Dr. Jane Smith',
        'prescriber_license': 'MD12345',
        'date_prescribed': '2025-10-14'
    }
    
    confidence_scores = {
        'ocr_confidence': 0.96,
        'nlp_confidence': 0.94,
        'overall_confidence': 0.95
    }
    
    trial_prescription = trial_service.record_ai_prediction(
        trial_prescription,
        ai_prediction,
        confidence_scores
    )
    
    print(f"Recorded AI prediction with accuracy: {trial_prescription.overall_accuracy:.2%}")
    
    # Step 5: Get statistics (after collecting many prescriptions)
    stats = trial_service.get_trial_statistics(trial)
    
    print(f"\nTrial Statistics:")
    print(f"Mean Accuracy: {stats['accuracy_metrics']['mean_accuracy']:.2%}")
    print(f"Total Errors: {stats['error_analysis']['total_errors']}")
    
    # Step 6: Generate regulatory report
    report = trial_service.generate_regulatory_report(trial)
    print(f"\nRegulatory Report:\n{report}")
    
    return trial


if __name__ == '__main__':
    example_clinical_trial_workflow()