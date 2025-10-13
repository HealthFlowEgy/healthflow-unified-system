"""
Model Performance Monitoring Service

Real-time monitoring of model performance, drift detection, and alerting.
Tracks prediction quality, confidence scores, and data distribution changes.

Author: HealthFlow ML Engineering Team  
Date: 2025-10-28
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from src.models.database import db
import numpy as np
import logging
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Types of metrics to track"""
    ACCURACY = "accuracy"
    CONFIDENCE = "confidence"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class ModelPrediction(db.Model):
    """
    Record of every model prediction for monitoring
    """
    __tablename__ = 'model_predictions'
    
    id = Column(Integer, primary_key=True)
    prediction_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Model information
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(20), nullable=False)
    model_stage = Column(String(20), nullable=False)
    
    # Prediction details
    input_data_hash = Column(String(64), nullable=True)  # SHA-256 hash of input
    prediction = Column(JSON, nullable=False)
    confidence_score = Column(Float, nullable=True)
    
    # Performance metrics
    latency_ms = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Ground truth (if available)
    ground_truth = Column(JSON, nullable=True)
    is_correct = Column(JSON, nullable=True)  # Per-field correctness
    
    # Context
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=True)
    session_id = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<ModelPrediction {self.prediction_id}: {self.model_name} v{self.model_version}>"


class ModelMetric(db.Model):
    """
    Aggregated model metrics over time windows
    """
    __tablename__ = 'model_metrics'
    
    id = Column(Integer, primary_key=True)
    
    # Model information
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(20), nullable=False)
    
    # Time window
    window_start = Column(DateTime, nullable=False, index=True)
    window_end = Column(DateTime, nullable=False)
    window_size_minutes = Column(Integer, nullable=False)
    
    # Metrics
    metric_type = Column(String(50), nullable=False)
    metric_value = Column(Float, nullable=False)
    
    # Statistics
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    std_dev = Column(Float, nullable=True)
    percentile_95 = Column(Float, nullable=True)
    
    # Sample size
    sample_count = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ModelMetric {self.model_name} {self.metric_type}: {self.metric_value}>"


class ModelAlert(db.Model):
    """
    Alerts for model performance issues
    """
    __tablename__ = 'model_alerts'
    
    id = Column(Integer, primary_key=True)
    alert_id = Column(String(50), unique=True, nullable=False)
    
    # Model information
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(20), nullable=False)
    
    # Alert details
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    message = Column(String(500), nullable=False)
    details = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, default='OPEN')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    def __repr__(self):
        return f"<ModelAlert {self.alert_id}: {self.alert_type}>"


class ModelMonitoringService:
    """
    Service for monitoring model performance in real-time
    """
    
    # Thresholds for alerts
    CONFIDENCE_THRESHOLD_LOW = 0.80
    LATENCY_THRESHOLD_MS = 2000
    ERROR_RATE_THRESHOLD = 0.10
    ACCURACY_DROP_THRESHOLD = 0.05  # 5% drop triggers alert
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def log_prediction(
        self,
        model_name: str,
        model_version: str,
        model_stage: str,
        prediction: Dict[str, Any],
        confidence_score: Optional[float],
        latency_ms: float,
        input_data_hash: Optional[str] = None,
        ground_truth: Optional[Dict[str, Any]] = None,
        prescription_id: Optional[int] = None
    ) -> ModelPrediction:
        """
        Log a model prediction for monitoring
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            model_stage: Stage (Production, Staging)
            prediction: Prediction output
            confidence_score: Overall confidence score
            latency_ms: Prediction latency in milliseconds
            input_data_hash: Hash of input data (for deduplication)
            ground_truth: True labels (if available)
            prescription_id: Related prescription ID
        
        Returns:
            Created ModelPrediction instance
        """
        # Calculate correctness if ground truth available
        is_correct = None
        if ground_truth and prediction:
            is_correct = self._calculate_correctness(prediction, ground_truth)
        
        # Create prediction record
        pred_record = ModelPrediction(
            prediction_id=self._generate_prediction_id(),
            model_name=model_name,
            model_version=model_version,
            model_stage=model_stage,
            input_data_hash=input_data_hash,
            prediction=prediction,
            confidence_score=confidence_score,
            latency_ms=latency_ms,
            ground_truth=ground_truth,
            is_correct=is_correct,
            prescription_id=prescription_id
        )
        
        db.session.add(pred_record)
        db.session.commit()
        
        # Check for real-time alerts
        self._check_realtime_alerts(pred_record)
        
        return pred_record
    
    def _calculate_correctness(
        self,
        prediction: Dict[str, Any],
        ground_truth: Dict[str, Any]
    ) -> Dict[str, bool]:
        """Calculate per-field correctness"""
        correctness = {}
        
        for key in ground_truth.keys():
            if key in prediction:
                correctness[key] = prediction[key] == ground_truth[key]
        
        return correctness
    
    def _check_realtime_alerts(self, prediction: ModelPrediction):
        """Check if prediction triggers any real-time alerts"""
        
        # Alert 1: Low confidence
        if prediction.confidence_score and prediction.confidence_score < self.CONFIDENCE_THRESHOLD_LOW:
            self.create_alert(
                model_name=prediction.model_name,
                model_version=prediction.model_version,
                alert_type='LOW_CONFIDENCE',
                severity=AlertSeverity.WARNING,
                message=f"Low confidence prediction: {prediction.confidence_score:.2%}",
                details={'prediction_id': prediction.prediction_id, 'confidence': prediction.confidence_score}
            )
        
        # Alert 2: High latency
        if prediction.latency_ms > self.LATENCY_THRESHOLD_MS:
            self.create_alert(
                model_name=prediction.model_name,
                model_version=prediction.model_version,
                alert_type='HIGH_LATENCY',
                severity=AlertSeverity.WARNING,
                message=f"High latency: {prediction.latency_ms:.0f}ms",
                details={'prediction_id': prediction.prediction_id, 'latency_ms': prediction.latency_ms}
            )
    
    def calculate_aggregated_metrics(
        self,
        model_name: str,
        window_size_minutes: int = 60,
        lookback_hours: int = 24
    ) -> List[ModelMetric]:
        """
        Calculate aggregated metrics over time windows
        
        Args:
            model_name: Name of the model to analyze
            window_size_minutes: Size of time window for aggregation
            lookback_hours: How far back to calculate metrics
        
        Returns:
            List of ModelMetric instances
        """
        start_time = datetime.utcnow() - timedelta(hours=lookback_hours)
        
        # Get all predictions in time range
        predictions = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= start_time
        ).order_by(ModelPrediction.timestamp).all()
        
        if not predictions:
            return []
        
        # Group predictions into time windows
        windows = self._group_into_windows(predictions, window_size_minutes)
        
        # Calculate metrics for each window
        metrics = []
        for window_start, window_preds in windows.items():
            window_end = window_start + timedelta(minutes=window_size_minutes)
            
            # Calculate various metrics
            metrics.extend(self._calculate_window_metrics(
                model_name,
                window_preds,
                window_start,
                window_end,
                window_size_minutes
            ))
        
        # Save to database
        for metric in metrics:
            db.session.add(metric)
        db.session.commit()
        
        return metrics
    
    def _group_into_windows(
        self,
        predictions: List[ModelPrediction],
        window_size_minutes: int
    ) -> Dict[datetime, List[ModelPrediction]]:
        """Group predictions into time windows"""
        windows = defaultdict(list)
        
        for pred in predictions:
            # Round down to nearest window start
            window_start = pred.timestamp.replace(
                minute=(pred.timestamp.minute // window_size_minutes) * window_size_minutes,
                second=0,
                microsecond=0
            )
            windows[window_start].append(pred)
        
        return windows
    
    def _calculate_window_metrics(
        self,
        model_name: str,
        predictions: List[ModelPrediction],
        window_start: datetime,
        window_end: datetime,
        window_size_minutes: int
    ) -> List[ModelMetric]:
        """Calculate metrics for a time window"""
        metrics = []
        
        if not predictions:
            return metrics
        
        # Get model version (use most common in window)
        model_version = max(set(p.model_version for p in predictions), key=lambda v: sum(1 for p in predictions if p.model_version == v))
        
        # Metric 1: Average confidence
        confidences = [p.confidence_score for p in predictions if p.confidence_score is not None]
        if confidences:
            metrics.append(ModelMetric(
                model_name=model_name,
                model_version=model_version,
                window_start=window_start,
                window_end=window_end,
                window_size_minutes=window_size_minutes,
                metric_type=MetricType.CONFIDENCE.value,
                metric_value=statistics.mean(confidences),
                min_value=min(confidences),
                max_value=max(confidences),
                std_dev=statistics.stdev(confidences) if len(confidences) > 1 else 0,
                percentile_95=np.percentile(confidences, 95),
                sample_count=len(confidences)
            ))
        
        # Metric 2: Average latency
        latencies = [p.latency_ms for p in predictions]
        metrics.append(ModelMetric(
            model_name=model_name,
            model_version=model_version,
            window_start=window_start,
            window_end=window_end,
            window_size_minutes=window_size_minutes,
            metric_type=MetricType.LATENCY.value,
            metric_value=statistics.mean(latencies),
            min_value=min(latencies),
            max_value=max(latencies),
            std_dev=statistics.stdev(latencies) if len(latencies) > 1 else 0,
            percentile_95=np.percentile(latencies, 95),
            sample_count=len(latencies)
        ))
        
        # Metric 3: Accuracy (if ground truth available)
        predictions_with_truth = [p for p in predictions if p.ground_truth and p.is_correct]
        if predictions_with_truth:
            # Calculate overall accuracy
            correct_counts = []
            for p in predictions_with_truth:
                if p.is_correct:
                    total_fields = len(p.is_correct)
                    correct_fields = sum(1 for v in p.is_correct.values() if v)
                    correct_counts.append(correct_fields / total_fields if total_fields > 0 else 0)
            
            if correct_counts:
                metrics.append(ModelMetric(
                    model_name=model_name,
                    model_version=model_version,
                    window_start=window_start,
                    window_end=window_end,
                    window_size_minutes=window_size_minutes,
                    metric_type=MetricType.ACCURACY.value,
                    metric_value=statistics.mean(correct_counts),
                    min_value=min(correct_counts),
                    max_value=max(correct_counts),
                    std_dev=statistics.stdev(correct_counts) if len(correct_counts) > 1 else 0,
                    sample_count=len(correct_counts)
                ))
        
        # Metric 4: Throughput
        throughput = len(predictions) / (window_size_minutes / 60)  # predictions per hour
        metrics.append(ModelMetric(
            model_name=model_name,
            model_version=model_version,
            window_start=window_start,
            window_end=window_end,
            window_size_minutes=window_size_minutes,
            metric_type=MetricType.THROUGHPUT.value,
            metric_value=throughput,
            sample_count=len(predictions)
        ))
        
        return metrics
    
    def detect_performance_degradation(
        self,
        model_name: str,
        metric_type: MetricType,
        lookback_hours: int = 24,
        comparison_period_hours: int = 168  # 1 week
    ) -> Optional[Dict[str, Any]]:
        """
        Detect if model performance has degraded
        
        Args:
            model_name: Name of the model
            metric_type: Type of metric to check
            lookback_hours: Recent period to analyze
            comparison_period_hours: Historical period to compare against
        
        Returns:
            Degradation details if detected, None otherwise
        """
        # Get recent metrics
        recent_start = datetime.utcnow() - timedelta(hours=lookback_hours)
        recent_metrics = ModelMetric.query.filter(
            ModelMetric.model_name == model_name,
            ModelMetric.metric_type == metric_type.value,
            ModelMetric.window_start >= recent_start
        ).all()
        
        if not recent_metrics:
            return None
        
        recent_avg = statistics.mean([m.metric_value for m in recent_metrics])
        
        # Get historical metrics
        historical_start = datetime.utcnow() - timedelta(hours=comparison_period_hours)
        historical_end = recent_start
        historical_metrics = ModelMetric.query.filter(
            ModelMetric.model_name == model_name,
            ModelMetric.metric_type == metric_type.value,
            ModelMetric.window_start >= historical_start,
            ModelMetric.window_start < historical_end
        ).all()
        
        if not historical_metrics:
            return None
        
        historical_avg = statistics.mean([m.metric_value for m in historical_metrics])
        
        # Calculate change
        if metric_type == MetricType.ACCURACY:
            # For accuracy, lower is worse
            change = recent_avg - historical_avg
            degraded = change < -self.ACCURACY_DROP_THRESHOLD
        elif metric_type == MetricType.LATENCY:
            # For latency, higher is worse
            change = recent_avg - historical_avg
            degraded = change > (historical_avg * 0.20)  # 20% increase
        elif metric_type == MetricType.CONFIDENCE:
            # For confidence, lower is worse
            change = recent_avg - historical_avg
            degraded = change < -0.05  # 5% drop
        else:
            return None
        
        if degraded:
            return {
                'model_name': model_name,
                'metric_type': metric_type.value,
                'recent_value': recent_avg,
                'historical_value': historical_avg,
                'change': change,
                'percent_change': (change / historical_avg * 100) if historical_avg != 0 else 0,
                'degraded': True
            }
        
        return None
    
    def create_alert(
        self,
        model_name: str,
        model_version: str,
        alert_type: str,
        severity: AlertSeverity,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> ModelAlert:
        """Create a model performance alert"""
        alert = ModelAlert(
            alert_id=self._generate_alert_id(),
            model_name=model_name,
            model_version=model_version,
            alert_type=alert_type,
            severity=severity.value,
            message=message,
            details=details
        )
        
        db.session.add(alert)
        db.session.commit()
        
        # Log critical alerts
        if severity == AlertSeverity.CRITICAL:
            self.logger.critical(f"Model Alert: {message}", extra={'alert_id': alert.alert_id})
        
        return alert
    
    def get_model_dashboard_data(
        self,
        model_name: str,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data for a model
        
        Args:
            model_name: Name of the model
            hours: Hours of data to retrieve
        
        Returns:
            Dictionary with dashboard data
        """
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get recent predictions
        predictions = ModelPrediction.query.filter(
            ModelPrediction.model_name == model_name,
            ModelPrediction.timestamp >= start_time
        ).all()
        
        # Get metrics
        metrics = ModelMetric.query.filter(
            ModelMetric.model_name == model_name,
            ModelMetric.window_start >= start_time
        ).all()
        
        # Get active alerts
        active_alerts = ModelAlert.query.filter(
            ModelAlert.model_name == model_name,
            ModelAlert.status == 'OPEN'
        ).all()
        
        # Organize metrics by type
        metrics_by_type = defaultdict(list)
        for metric in metrics:
            metrics_by_type[metric.metric_type].append({
                'timestamp': metric.window_start.isoformat(),
                'value': metric.metric_value,
                'min': metric.min_value,
                'max': metric.max_value,
                'p95': metric.percentile_95
            })
        
        # Calculate summary statistics
        if predictions:
            avg_confidence = statistics.mean([p.confidence_score for p in predictions if p.confidence_score])
            avg_latency = statistics.mean([p.latency_ms for p in predictions])
            total_predictions = len(predictions)
        else:
            avg_confidence = 0
            avg_latency = 0
            total_predictions = 0
        
        return {
            'model_name': model_name,
            'time_range_hours': hours,
            'summary': {
                'total_predictions': total_predictions,
                'avg_confidence': avg_confidence,
                'avg_latency_ms': avg_latency,
                'active_alerts': len(active_alerts)
            },
            'metrics_over_time': dict(metrics_by_type),
            'alerts': [
                {
                    'alert_id': alert.alert_id,
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'message': alert.message,
                    'created_at': alert.created_at.isoformat()
                }
                for alert in active_alerts
            ]
        }
    
    def _generate_prediction_id(self) -> str:
        """Generate unique prediction ID"""
        import uuid
        return f"PRED-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    
    def _generate_alert_id(self) -> str:
        """Generate unique alert ID"""
        import uuid
        return f"ALR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"


if __name__ == '__main__':
    # Example usage
    monitoring = ModelMonitoringService()
    
    # Log a prediction
    monitoring.log_prediction(
        model_name="medical-prescription-ocr",
        model_version="2",
        model_stage="Production",
        prediction={'text': 'Metformin 500mg twice daily'},
        confidence_score=0.96,
        latency_ms=450
    )
    
    # Calculate metrics
    metrics = monitoring.calculate_aggregated_metrics(
        model_name="medical-prescription-ocr",
        window_size_minutes=60,
        lookback_hours=24
    )
    
    print(f"Calculated {len(metrics)} metrics")