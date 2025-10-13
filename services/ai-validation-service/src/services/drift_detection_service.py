"""
Drift Detection & A/B Testing System

Detects data and prediction drift, and enables safe A/B testing of model versions.

Components:
- Data drift detection (input distribution changes)
- Prediction drift detection (output distribution changes)
- A/B testing framework with statistical significance
- Champion/Challenger model comparison

Author: HealthFlow ML Engineering Team
Date: 2025-10-28
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON
from src.models.database import db
import numpy as np
from scipy import stats
from collections import defaultdict, Counter
import logging
import hashlib
import random

logger = logging.getLogger(__name__)


class DriftType(str, Enum):
    """Types of drift"""
    DATA_DRIFT = "DATA_DRIFT"
    PREDICTION_DRIFT = "PREDICTION_DRIFT"
    CONCEPT_DRIFT = "CONCEPT_DRIFT"


class ABTestStatus(str, Enum):
    """A/B test status"""
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class DriftDetection(db.Model):
    """
    Records of detected drift
    """
    __tablename__ = 'drift_detections'
    
    id = Column(Integer, primary_key=True)
    detection_id = Column(String(50), unique=True, nullable=False)
    
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(20), nullable=False)
    
    drift_type = Column(String(50), nullable=False)
    drift_score = Column(Float, nullable=False)  # 0-1, higher = more drift
    threshold = Column(Float, nullable=False)
    
    # Statistical test results
    test_statistic = Column(Float, nullable=True)
    p_value = Column(Float, nullable=True)
    
    # Details
    affected_features = Column(JSON, nullable=True)
    baseline_period = Column(JSON, nullable=True)
    current_period = Column(JSON, nullable=True)
    
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<DriftDetection {self.detection_id}: {self.drift_type} score={self.drift_score:.3f}>"


class ABTest(db.Model):
    """
    A/B test configuration and results
    """
    __tablename__ = 'ab_tests'
    
    id = Column(Integer, primary_key=True)
    test_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Test configuration
    test_name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Models being tested
    champion_model = Column(String(100), nullable=False)
    champion_version = Column(String(20), nullable=False)
    challenger_model = Column(String(100), nullable=False)
    challenger_version = Column(String(20), nullable=False)
    
    # Traffic split
    traffic_split = Column(Float, nullable=False, default=0.5)  # % to challenger
    
    # Test parameters
    min_sample_size = Column(Integer, nullable=False, default=1000)
    max_duration_days = Column(Integer, nullable=False, default=14)
    significance_level = Column(Float, nullable=False, default=0.05)
    
    # Status
    status = Column(String(20), nullable=False, default=ABTestStatus.RUNNING.value)
    
    # Results
    champion_samples = Column(Integer, default=0)
    challenger_samples = Column(Integer, default=0)
    winner = Column(String(20), nullable=True)  # 'champion', 'challenger', or None
    statistical_significance = Column(Boolean, default=False)
    
    # Metrics
    metrics = Column(JSON, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<ABTest {self.test_id}: {self.champion_model} vs {self.challenger_model}>"


class DriftDetectionService:
    """
    Service for detecting data and prediction drift
    """
    
    # Thresholds
    DATA_DRIFT_THRESHOLD = 0.05  # PSI threshold
    PREDICTION_DRIFT_THRESHOLD = 0.10
    MIN_SAMPLES = 100
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def detect_data_drift(
        self,
        model_name: str,
        model_version: str,
        baseline_start: datetime,
        baseline_end: datetime,
        current_start: datetime,
        current_end: datetime
    ) -> Optional[DriftDetection]:
        """
        Detect data drift using Population Stability Index (PSI)
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            baseline_start: Start of baseline period
            baseline_end: End of baseline period
            current_start: Start of current period
            current_end: End of current period
        
        Returns:
            DriftDetection if drift detected, None otherwise
        """
        from src.services.model_monitoring_service import ModelPrediction
        
        # Get baseline predictions
        baseline_preds = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= baseline_start,
            ModelPrediction.timestamp < baseline_end
        ).all()
        
        # Get current predictions
        current_preds = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= current_start,
            ModelPrediction.timestamp < current_end
        ).all()
        
        if len(baseline_preds) < self.MIN_SAMPLES or len(current_preds) < self.MIN_SAMPLES:
            self.logger.warning(f"Insufficient samples for drift detection: {len(baseline_preds)}, {len(current_preds)}")
            return None
        
        # Calculate PSI for confidence scores
        baseline_confidences = [p.confidence_score for p in baseline_preds if p.confidence_score]
        current_confidences = [p.confidence_score for p in current_preds if p.confidence_score]
        
        psi_score = self._calculate_psi(baseline_confidences, current_confidences)
        
        # Detect drift
        if psi_score > self.DATA_DRIFT_THRESHOLD:
            detection = DriftDetection(
                detection_id=self._generate_detection_id(),
                model_name=model_name,
                model_version=model_version,
                drift_type=DriftType.DATA_DRIFT.value,
                drift_score=psi_score,
                threshold=self.DATA_DRIFT_THRESHOLD,
                affected_features=['confidence_distribution'],
                baseline_period={
                    'start': baseline_start.isoformat(),
                    'end': baseline_end.isoformat(),
                    'samples': len(baseline_preds),
                    'mean_confidence': np.mean(baseline_confidences)
                },
                current_period={
                    'start': current_start.isoformat(),
                    'end': current_end.isoformat(),
                    'samples': len(current_preds),
                    'mean_confidence': np.mean(current_confidences)
                }
            )
            
            db.session.add(detection)
            db.session.commit()
            
            self.logger.warning(
                f"Data drift detected for {model_name} v{model_version}: "
                f"PSI={psi_score:.3f}"
            )
            
            return detection
        
        return None
    
    def _calculate_psi(
        self,
        baseline: List[float],
        current: List[float],
        bins: int = 10
    ) -> float:
        """
        Calculate Population Stability Index
        
        PSI = sum((current_pct - baseline_pct) * ln(current_pct / baseline_pct))
        """
        # Create bins
        min_val = min(min(baseline), min(current))
        max_val = max(max(baseline), max(current))
        bin_edges = np.linspace(min_val, max_val, bins + 1)
        
        # Calculate distributions
        baseline_hist, _ = np.histogram(baseline, bins=bin_edges)
        current_hist, _ = np.histogram(current, bins=bin_edges)
        
        # Convert to percentages
        baseline_pct = baseline_hist / len(baseline)
        current_pct = current_hist / len(current)
        
        # Avoid division by zero
        baseline_pct = np.where(baseline_pct == 0, 0.0001, baseline_pct)
        current_pct = np.where(current_pct == 0, 0.0001, current_pct)
        
        # Calculate PSI
        psi = np.sum((current_pct - baseline_pct) * np.log(current_pct / baseline_pct))
        
        return abs(psi)
    
    def detect_prediction_drift(
        self,
        model_name: str,
        model_version: str,
        lookback_days: int = 7
    ) -> Optional[DriftDetection]:
        """
        Detect prediction drift using statistical tests
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            lookback_days: Days to analyze
        
        Returns:
            DriftDetection if drift detected
        """
        from src.services.model_monitoring_service import ModelPrediction
        
        # Split time period in half
        end_time = datetime.utcnow()
        mid_time = end_time - timedelta(days=lookback_days / 2)
        start_time = end_time - timedelta(days=lookback_days)
        
        # Get predictions from both periods
        early_preds = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= start_time,
            ModelPrediction.timestamp < mid_time
        ).all()
        
        recent_preds = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= mid_time,
            ModelPrediction.timestamp < end_time
        ).all()
        
        if len(early_preds) < self.MIN_SAMPLES or len(recent_preds) < self.MIN_SAMPLES:
            return None
        
        # Compare prediction distributions using Kolmogorov-Smirnov test
        early_confidences = [p.confidence_score for p in early_preds if p.confidence_score]
        recent_confidences = [p.confidence_score for p in recent_preds if p.confidence_score]
        
        # KS test
        statistic, p_value = stats.ks_2samp(early_confidences, recent_confidences)
        
        # Check if distributions are significantly different
        if p_value < 0.05:  # Significant difference
            # Calculate drift score (normalized KS statistic)
            drift_score = statistic
            
            if drift_score > self.PREDICTION_DRIFT_THRESHOLD:
                detection = DriftDetection(
                    detection_id=self._generate_detection_id(),
                    model_name=model_name,
                    model_version=model_version,
                    drift_type=DriftType.PREDICTION_DRIFT.value,
                    drift_score=drift_score,
                    threshold=self.PREDICTION_DRIFT_THRESHOLD,
                    test_statistic=statistic,
                    p_value=p_value,
                    baseline_period={
                        'start': start_time.isoformat(),
                        'end': mid_time.isoformat(),
                        'mean_confidence': np.mean(early_confidences),
                        'std_confidence': np.std(early_confidences)
                    },
                    current_period={
                        'start': mid_time.isoformat(),
                        'end': end_time.isoformat(),
                        'mean_confidence': np.mean(recent_confidences),
                        'std_confidence': np.std(recent_confidences)
                    }
                )
                
                db.session.add(detection)
                db.session.commit()
                
                self.logger.warning(
                    f"Prediction drift detected for {model_name}: "
                    f"KS={statistic:.3f}, p={p_value:.4f}"
                )
                
                return detection
        
        return None
    
    def _generate_detection_id(self) -> str:
        """Generate unique detection ID"""
        import uuid
        return f"DRIFT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"


class ABTestingService:
    """
    Service for A/B testing model versions
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def create_ab_test(
        self,
        test_name: str,
        champion_model: str,
        champion_version: str,
        challenger_model: str,
        challenger_version: str,
        traffic_split: float = 0.5,
        min_sample_size: int = 1000,
        max_duration_days: int = 14,
        description: Optional[str] = None
    ) -> ABTest:
        """
        Create a new A/B test
        
        Args:
            test_name: Name of the test
            champion_model: Current production model
            champion_version: Version of champion
            challenger_model: New model to test
            challenger_version: Version of challenger
            traffic_split: Percentage of traffic to challenger (0-1)
            min_sample_size: Minimum samples needed per variant
            max_duration_days: Maximum test duration
            description: Test description
        
        Returns:
            Created ABTest instance
        """
        test = ABTest(
            test_id=self._generate_test_id(),
            test_name=test_name,
            description=description,
            champion_model=champion_model,
            champion_version=champion_version,
            challenger_model=challenger_model,
            challenger_version=challenger_version,
            traffic_split=traffic_split,
            min_sample_size=min_sample_size,
            max_duration_days=max_duration_days
        )
        
        db.session.add(test)
        db.session.commit()
        
        self.logger.info(
            f"Created A/B test: {test_name} "
            f"({champion_model} v{champion_version} vs {challenger_model} v{challenger_version})"
        )
        
        return test
    
    def route_prediction(
        self,
        test_id: str,
        request_id: str
    ) -> Tuple[str, str]:
        """
        Route a prediction request to champion or challenger
        
        Args:
            test_id: ID of the A/B test
            request_id: Unique request identifier
        
        Returns:
            Tuple of (model_name, model_version)
        """
        test = ABTest.query.filter_by(test_id=test_id).first()
        
        if not test or test.status != ABTestStatus.RUNNING.value:
            raise ValueError(f"Test {test_id} not found or not running")
        
        # Consistent hashing for user assignment
        hash_val = int(hashlib.md5(request_id.encode()).hexdigest(), 16)
        assignment = (hash_val % 100) / 100.0
        
        if assignment < test.traffic_split:
            # Challenger
            return test.challenger_model, test.challenger_version
        else:
            # Champion
            return test.champion_model, test.champion_version
    
    def record_result(
        self,
        test_id: str,
        model_name: str,
        model_version: str,
        metric_value: float,
        metric_name: str = 'accuracy'
    ):
        """
        Record a result for A/B test
        
        Args:
            test_id: ID of the test
            model_name: Which model produced result
            model_version: Version of the model
            metric_value: Metric value
            metric_name: Name of metric
        """
        test = ABTest.query.filter_by(test_id=test_id).first()
        
        if not test:
            raise ValueError(f"Test {test_id} not found")
        
        # Initialize metrics if needed
        if not test.metrics:
            test.metrics = {
                'champion': defaultdict(list),
                'challenger': defaultdict(list)
            }
        
        # Record result
        if model_name == test.champion_model and model_version == test.champion_version:
            test.champion_samples += 1
            if not test.metrics:
                test.metrics = {'champion': {}, 'challenger': {}}
            if metric_name not in test.metrics['champion']:
                test.metrics['champion'][metric_name] = []
            test.metrics['champion'][metric_name].append(metric_value)
        elif model_name == test.challenger_model and model_version == test.challenger_version:
            test.challenger_samples += 1
            if not test.metrics:
                test.metrics = {'champion': {}, 'challenger': {}}
            if metric_name not in test.metrics['challenger']:
                test.metrics['challenger'][metric_name] = []
            test.metrics['challenger'][metric_name].append(metric_value)
        
        db.session.commit()
        
        # Check if test should be completed
        self._check_test_completion(test)
    
    def _check_test_completion(self, test: ABTest):
        """Check if test has enough data to complete"""
        
        # Check if minimum samples reached
        if test.champion_samples < test.min_sample_size or test.challenger_samples < test.min_sample_size:
            return
        
        # Check if max duration exceeded
        duration = datetime.utcnow() - test.started_at
        if duration > timedelta(days=test.max_duration_days):
            self._complete_test(test)
            return
        
        # Check statistical significance
        if test.metrics:
            for metric_name in test.metrics.get('champion', {}).keys():
                champion_values = test.metrics['champion'].get(metric_name, [])
                challenger_values = test.metrics['challenger'].get(metric_name, [])
                
                if len(champion_values) >= test.min_sample_size and len(challenger_values) >= test.min_sample_size:
                    # Perform t-test
                    t_stat, p_value = stats.ttest_ind(champion_values, challenger_values)
                    
                    if p_value < test.significance_level:
                        test.statistical_significance = True
                        self._complete_test(test)
                        return
    
    def _complete_test(self, test: ABTest):
        """Complete the A/B test and determine winner"""
        
        test.status = ABTestStatus.COMPLETED.value
        test.completed_at = datetime.utcnow()
        
        # Determine winner based on primary metric (accuracy)
        if test.metrics:
            champion_accuracy = test.metrics.get('champion', {}).get('accuracy', [])
            challenger_accuracy = test.metrics.get('challenger', {}).get('accuracy', [])
            
            if champion_accuracy and challenger_accuracy:
                champion_mean = np.mean(champion_accuracy)
                challenger_mean = np.mean(challenger_accuracy)
                
                # Perform t-test
                t_stat, p_value = stats.ttest_ind(champion_accuracy, challenger_accuracy)
                
                if p_value < test.significance_level:
                    # Statistically significant difference
                    if challenger_mean > champion_mean:
                        test.winner = 'challenger'
                        self.logger.info(
                            f"Test {test.test_id} completed: Challenger wins! "
                            f"({challenger_mean:.3f} vs {champion_mean:.3f}, p={p_value:.4f})"
                        )
                    else:
                        test.winner = 'champion'
                        self.logger.info(
                            f"Test {test.test_id} completed: Champion retains! "
                            f"({champion_mean:.3f} vs {challenger_mean:.3f}, p={p_value:.4f})"
                        )
                else:
                    # No significant difference
                    test.winner = None
                    self.logger.info(
                        f"Test {test.test_id} completed: No significant difference "
                        f"(p={p_value:.4f})"
                    )
        
        db.session.commit()
    
    def get_test_results(self, test_id: str) -> Dict[str, Any]:
        """
        Get comprehensive test results
        
        Args:
            test_id: ID of the test
        
        Returns:
            Dictionary with test results
        """
        test = ABTest.query.filter_by(test_id=test_id).first()
        
        if not test:
            raise ValueError(f"Test {test_id} not found")
        
        results = {
            'test_id': test.test_id,
            'test_name': test.test_name,
            'status': test.status,
            'started_at': test.started_at.isoformat(),
            'completed_at': test.completed_at.isoformat() if test.completed_at else None,
            'duration_days': (test.completed_at - test.started_at).days if test.completed_at else (datetime.utcnow() - test.started_at).days,
            'champion': {
                'model': test.champion_model,
                'version': test.champion_version,
                'samples': test.champion_samples
            },
            'challenger': {
                'model': test.challenger_model,
                'version': test.challenger_version,
                'samples': test.challenger_samples
            },
            'traffic_split': test.traffic_split,
            'winner': test.winner,
            'statistical_significance': test.statistical_significance,
            'metrics': {}
        }
        
        # Add detailed metrics
        if test.metrics:
            for variant in ['champion', 'challenger']:
                results['metrics'][variant] = {}
                for metric_name, values in test.metrics.get(variant, {}).items():
                    if values:
                        results['metrics'][variant][metric_name] = {
                            'mean': np.mean(values),
                            'median': np.median(values),
                            'std': np.std(values),
                            'min': np.min(values),
                            'max': np.max(values),
                            'samples': len(values)
                        }
            
            # Add statistical comparison
            if test.metrics.get('champion') and test.metrics.get('challenger'):
                results['statistical_tests'] = {}
                for metric_name in test.metrics['champion'].keys():
                    if metric_name in test.metrics['challenger']:
                        champion_vals = test.metrics['champion'][metric_name]
                        challenger_vals = test.metrics['challenger'][metric_name]
                        
                        if len(champion_vals) > 1 and len(challenger_vals) > 1:
                            t_stat, p_value = stats.ttest_ind(champion_vals, challenger_vals)
                            
                            results['statistical_tests'][metric_name] = {
                                't_statistic': t_stat,
                                'p_value': p_value,
                                'significant': p_value < test.significance_level,
                                'effect_size': (np.mean(challenger_vals) - np.mean(champion_vals)) / np.std(champion_vals + challenger_vals)
                            }
        
        return results
    
    def pause_test(self, test_id: str):
        """Pause an ongoing test"""
        test = ABTest.query.filter_by(test_id=test_id).first()
        if test:
            test.status = ABTestStatus.PAUSED.value
            db.session.commit()
            self.logger.info(f"Paused test {test_id}")
    
    def resume_test(self, test_id: str):
        """Resume a paused test"""
        test = ABTest.query.filter_by(test_id=test_id).first()
        if test and test.status == ABTestStatus.PAUSED.value:
            test.status = ABTestStatus.RUNNING.value
            db.session.commit()
            self.logger.info(f"Resumed test {test_id}")
    
    def cancel_test(self, test_id: str):
        """Cancel a test"""
        test = ABTest.query.filter_by(test_id=test_id).first()
        if test:
            test.status = ABTestStatus.CANCELLED.value
            test.completed_at = datetime.utcnow()
            db.session.commit()
            self.logger.info(f"Cancelled test {test_id}")
    
    def _generate_test_id(self) -> str:
        """Generate unique test ID"""
        import uuid
        return f"ABT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"


# ============================================================================
# API Routes
# ============================================================================

from flask import Blueprint, request, jsonify, g
from src.services.auth_service import require_auth, require_role

mlops_bp = Blueprint('mlops', __name__, url_prefix='/api/mlops')
drift_service = DriftDetectionService()
ab_service = ABTestingService()


@mlops_bp.route('/drift/detect', methods=['POST'])
@require_auth
@require_role(['admin', 'ml_engineer'])
def detect_drift():
    """
    Trigger drift detection
    
    Request:
        {
            "model_name": "medical-prescription-ocr",
            "model_version": "2",
            "drift_type": "DATA_DRIFT",
            "lookback_days": 7
        }
    """
    data = request.get_json()
    
    model_name = data['model_name']
    model_version = data['model_version']
    drift_type = data.get('drift_type', 'DATA_DRIFT')
    lookback_days = data.get('lookback_days', 7)
    
    if drift_type == 'DATA_DRIFT':
        # Data drift detection
        end_time = datetime.utcnow()
        mid_time = end_time - timedelta(days=lookback_days / 2)
        start_time = end_time - timedelta(days=lookback_days)
        
        detection = drift_service.detect_data_drift(
            model_name=model_name,
            model_version=model_version,
            baseline_start=start_time,
            baseline_end=mid_time,
            current_start=mid_time,
            current_end=end_time
        )
    elif drift_type == 'PREDICTION_DRIFT':
        detection = drift_service.detect_prediction_drift(
            model_name=model_name,
            model_version=model_version,
            lookback_days=lookback_days
        )
    else:
        return jsonify({'status': 'error', 'message': 'Invalid drift type'}), 400
    
    if detection:
        return jsonify({
            'status': 'success',
            'data': {
                'drift_detected': True,
                'detection_id': detection.detection_id,
                'drift_score': detection.drift_score,
                'threshold': detection.threshold,
                'p_value': detection.p_value
            }
        }), 200
    else:
        return jsonify({
            'status': 'success',
            'data': {
                'drift_detected': False,
                'message': 'No significant drift detected'
            }
        }), 200


@mlops_bp.route('/ab-tests', methods=['POST'])
@require_auth
@require_role(['admin', 'ml_engineer'])
def create_ab_test():
    """
    Create new A/B test
    
    Request:
        {
            "test_name": "OCR Model v2 vs v3",
            "champion_model": "medical-prescription-ocr",
            "champion_version": "2",
            "challenger_model": "medical-prescription-ocr",
            "challenger_version": "3",
            "traffic_split": 0.5,
            "min_sample_size": 1000,
            "description": "Testing improved OCR model"
        }
    """
    data = request.get_json()
    
    test = ab_service.create_ab_test(
        test_name=data['test_name'],
        champion_model=data['champion_model'],
        champion_version=data['champion_version'],
        challenger_model=data['challenger_model'],
        challenger_version=data['challenger_version'],
        traffic_split=data.get('traffic_split', 0.5),
        min_sample_size=data.get('min_sample_size', 1000),
        max_duration_days=data.get('max_duration_days', 14),
        description=data.get('description')
    )
    
    return jsonify({
        'status': 'success',
        'data': {
            'test_id': test.test_id,
            'test_name': test.test_name,
            'started_at': test.started_at.isoformat()
        }
    }), 201


@mlops_bp.route('/ab-tests/<test_id>', methods=['GET'])
@require_auth
@require_role(['admin', 'ml_engineer', 'auditor'])
def get_ab_test_results(test_id: str):
    """Get A/B test results"""
    try:
        results = ab_service.get_test_results(test_id)
        return jsonify({
            'status': 'success',
            'data': results
        }), 200
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 404


@mlops_bp.route('/ab-tests/<test_id>/pause', methods=['POST'])
@require_auth
@require_role(['admin', 'ml_engineer'])
def pause_ab_test(test_id: str):
    """Pause A/B test"""
    ab_service.pause_test(test_id)
    return jsonify({
        'status': 'success',
        'message': 'Test paused'
    }), 200


@mlops_bp.route('/ab-tests/<test_id>/resume', methods=['POST'])
@require_auth
@require_role(['admin', 'ml_engineer'])
def resume_ab_test(test_id: str):
    """Resume A/B test"""
    ab_service.resume_test(test_id)
    return jsonify({
        'status': 'success',
        'message': 'Test resumed'
    }), 200


@mlops_bp.route('/ab-tests/<test_id>/cancel', methods=['POST'])
@require_auth
@require_role(['admin', 'ml_engineer'])
def cancel_ab_test(test_id: str):
    """Cancel A/B test"""
    ab_service.cancel_test(test_id)
    return jsonify({
        'status': 'success',
        'message': 'Test cancelled'
    }), 200


@mlops_bp.route('/ab-tests/active', methods=['GET'])
@require_auth
def get_active_ab_tests():
    """Get all active A/B tests"""
    tests = ABTest.query.filter_by(status=ABTestStatus.RUNNING.value).all()
    
    return jsonify({
        'status': 'success',
        'data': {
            'tests': [
                {
                    'test_id': t.test_id,
                    'test_name': t.test_name,
                    'champion': f"{t.champion_model} v{t.champion_version}",
                    'challenger': f"{t.challenger_model} v{t.challenger_version}",
                    'samples': {
                        'champion': t.champion_samples,
                        'challenger': t.challenger_samples
                    },
                    'started_at': t.started_at.isoformat()
                }
                for t in tests
            ]
        }
    }), 200


# ============================================================================
# Example Usage
# ============================================================================

def example_drift_and_ab_testing():
    """Example workflow for drift detection and A/B testing"""
    
    # Initialize services
    drift_service = DriftDetectionService()
    ab_service = ABTestingService()
    
    # Example 1: Detect data drift
    print("\n=== Data Drift Detection ===")
    end_time = datetime.utcnow()
    mid_time = end_time - timedelta(days=3.5)
    start_time = end_time - timedelta(days=7)
    
    drift = drift_service.detect_data_drift(
        model_name="medical-prescription-ocr",
        model_version="2",
        baseline_start=start_time,
        baseline_end=mid_time,
        current_start=mid_time,
        current_end=end_time
    )
    
    if drift:
        print(f"Drift detected! Score: {drift.drift_score:.3f}")
    else:
        print("No drift detected")
    
    # Example 2: Create A/B test
    print("\n=== A/B Test Creation ===")
    test = ab_service.create_ab_test(
        test_name="OCR v2 vs v3 Comparison",
        champion_model="medical-prescription-ocr",
        champion_version="2",
        challenger_model="medical-prescription-ocr",
        challenger_version="3",
        traffic_split=0.5,
        min_sample_size=1000,
        description="Testing improved Donut model"
    )
    
    print(f"Created test: {test.test_id}")
    
    # Example 3: Simulate routing
    print("\n=== Traffic Routing ===")
    for i in range(10):
        request_id = f"req-{i}"
        model, version = ab_service.route_prediction(test.test_id, request_id)
        print(f"Request {i}: {model} v{version}")
    
    # Example 4: Record results
    print("\n=== Recording Results ===")
    for i in range(100):
        request_id = f"req-{i}"
        model, version = ab_service.route_prediction(test.test_id, request_id)
        
        # Simulate accuracy (champion: 95%, challenger: 97%)
        if model == test.champion_model:
            accuracy = np.random.normal(0.95, 0.02)
        else:
            accuracy = np.random.normal(0.97, 0.02)
        
        ab_service.record_result(
            test_id=test.test_id,
            model_name=model,
            model_version=version,
            metric_value=accuracy,
            metric_name='accuracy'
        )
    
    # Example 5: Get results
    print("\n=== Test Results ===")
    results = ab_service.get_test_results(test.test_id)
    print(f"Champion samples: {results['champion']['samples']}")
    print(f"Challenger samples: {results['challenger']['samples']}")
    if results['metrics']:
        print(f"Champion accuracy: {results['metrics']['champion'].get('accuracy', {}).get('mean', 0):.3f}")
        print(f"Challenger accuracy: {results['metrics']['challenger'].get('accuracy', {}).get('mean', 0):.3f}")
    print(f"Winner: {results.get('winner', 'TBD')}")


if __name__ == '__main__':
    example_drift_and_ab_testing()