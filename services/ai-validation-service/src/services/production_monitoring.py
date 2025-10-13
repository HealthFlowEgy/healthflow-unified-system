"""
Production Monitoring and Alerting Service
Implements real-time monitoring, drift detection, and alert management
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import deque
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class MetricSnapshot:
    """Single metric measurement"""
    metric_name: str
    value: float
    timestamp: datetime
    metadata: Dict


@dataclass
class Alert:
    """Alert representation"""
    alert_id: str
    severity: str  # low, medium, high, critical
    title: str
    description: str
    metric_name: str
    current_value: float
    threshold_value: float
    timestamp: datetime
    acknowledged: bool = False


class MetricsCollector:
    """
    Collects and aggregates system and model metrics
    - Response times
    - Error rates
    - Model confidence scores
    - Resource utilization
    """
    
    def __init__(self, window_size: int = 1000):
        """
        Initialize metrics collector
        
        Args:
            window_size: Size of rolling window for metrics
        """
        self.window_size = window_size
        self.metrics = {
            "response_times": deque(maxlen=window_size),
            "confidence_scores": deque(maxlen=window_size),
            "error_rates": deque(maxlen=window_size),
            "throughput": deque(maxlen=window_size)
        }
        self.counters = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "low_confidence_predictions": 0
        }
    
    def record_request(
        self,
        response_time_ms: float,
        confidence_score: float,
        success: bool,
        metadata: Optional[Dict] = None
    ):
        """
        Record individual request metrics
        
        Args:
            response_time_ms: Request processing time
            confidence_score: Model confidence
            success: Whether request succeeded
            metadata: Additional context
        """
        timestamp = datetime.utcnow()
        
        # Update rolling windows
        self.metrics["response_times"].append(
            MetricSnapshot("response_time", response_time_ms, timestamp, metadata or {})
        )
        
        self.metrics["confidence_scores"].append(
            MetricSnapshot("confidence", confidence_score, timestamp, metadata or {})
        )
        
        # Update counters
        self.counters["total_requests"] += 1
        if success:
            self.counters["successful_requests"] += 1
        else:
            self.counters["failed_requests"] += 1
        
        if confidence_score < 0.80:
            self.counters["low_confidence_predictions"] += 1
        
        # Calculate error rate
        if self.counters["total_requests"] > 0:
            error_rate = (
                self.counters["failed_requests"] / 
                self.counters["total_requests"]
            )
            self.metrics["error_rates"].append(
                MetricSnapshot("error_rate", error_rate, timestamp, {})
            )
    
    def get_current_metrics(self) -> Dict:
        """Get current aggregated metrics"""
        return {
            "response_time": self._calculate_stats("response_times"),
            "confidence": self._calculate_stats("confidence_scores"),
            "error_rate": self._calculate_current_error_rate(),
            "throughput": self._calculate_throughput(),
            "counters": self.counters.copy(),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _calculate_stats(self, metric_name: str) -> Dict:
        """Calculate statistics for a metric"""
        if not self.metrics[metric_name]:
            return {
                "mean": 0,
                "median": 0,
                "p95": 0,
                "p99": 0,
                "min": 0,
                "max": 0
            }
        
        values = [m.value for m in self.metrics[metric_name]]
        values.sort()
        
        n = len(values)
        return {
            "mean": sum(values) / n,
            "median": values[n // 2],
            "p95": values[int(n * 0.95)] if n > 0 else 0,
            "p99": values[int(n * 0.99)] if n > 0 else 0,
            "min": min(values),
            "max": max(values)
        }
    
    def _calculate_current_error_rate(self) -> float:
        """Calculate current error rate"""
        if self.counters["total_requests"] == 0:
            return 0.0
        
        return (
            self.counters["failed_requests"] / 
            self.counters["total_requests"]
        )
    
    def _calculate_throughput(self) -> float:
        """Calculate requests per second"""
        if not self.metrics["response_times"]:
            return 0.0
        
        # Calculate based on last minute
        one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
        recent_requests = [
            m for m in self.metrics["response_times"]
            if m.timestamp > one_minute_ago
        ]
        
        return len(recent_requests) / 60.0  # requests per second


class DriftDetector:
    """
    Detects model performance drift
    Compares current performance to baseline
    """
    
    def __init__(self, baseline_metrics: Dict):
        """
        Initialize drift detector
        
        Args:
            baseline_metrics: Baseline performance metrics from training
        """
        self.baseline_metrics = baseline_metrics
        self.drift_thresholds = {
            "accuracy": 0.05,  # 5% drop
            "confidence": 0.10,  # 10% drop
            "response_time": 0.50  # 50% increase
        }
    
    def check_drift(self, current_metrics: Dict) -> Dict:
        """
        Check for drift in model performance
        
        Args:
            current_metrics: Current performance metrics
        
        Returns:
            Drift detection results
        """
        drift_detected = False
        drift_details = []
        
        # Check accuracy drift
        if "accuracy" in current_metrics and "accuracy" in self.baseline_metrics:
            accuracy_drift = (
                self.baseline_metrics["accuracy"] - 
                current_metrics["accuracy"]["mean"]
            )
            
            if accuracy_drift > self.drift_thresholds["accuracy"]:
                drift_detected = True
                drift_details.append({
                    "metric": "accuracy",
                    "baseline": self.baseline_metrics["accuracy"],
                    "current": current_metrics["accuracy"]["mean"],
                    "drift": accuracy_drift,
                    "threshold": self.drift_thresholds["accuracy"],
                    "severity": "high" if accuracy_drift > 0.10 else "medium"
                })
        
        # Check confidence drift
        if "confidence" in current_metrics:
            confidence_drift = (
                self.baseline_metrics.get("confidence", 0.90) - 
                current_metrics["confidence"]["mean"]
            )
            
            if confidence_drift > self.drift_thresholds["confidence"]:
                drift_detected = True
                drift_details.append({
                    "metric": "confidence",
                    "baseline": self.baseline_metrics.get("confidence", 0.90),
                    "current": current_metrics["confidence"]["mean"],
                    "drift": confidence_drift,
                    "threshold": self.drift_thresholds["confidence"],
                    "severity": "medium"
                })
        
        # Check response time drift
        if "response_time" in current_metrics:
            response_time_increase = (
                current_metrics["response_time"]["mean"] - 
                self.baseline_metrics.get("response_time", 500)
            ) / self.baseline_metrics.get("response_time", 500)
            
            if response_time_increase > self.drift_thresholds["response_time"]:
                drift_detected = True
                drift_details.append({
                    "metric": "response_time",
                    "baseline": self.baseline_metrics.get("response_time", 500),
                    "current": current_metrics["response_time"]["mean"],
                    "drift": response_time_increase,
                    "threshold": self.drift_thresholds["response_time"],
                    "severity": "low"
                })
        
        return {
            "drift_detected": drift_detected,
            "drift_count": len(drift_details),
            "details": drift_details,
            "timestamp": datetime.utcnow().isoformat(),
            "recommendation": self._generate_recommendation(drift_details)
        }
    
    def _generate_recommendation(self, drift_details: List[Dict]) -> str:
        """Generate recommendation based on drift"""
        if not drift_details:
            return "No action required"
        
        high_severity = any(d["severity"] == "high" for d in drift_details)
        
        if high_severity:
            return "Critical drift detected - consider model retraining immediately"
        else:
            return "Drift detected - schedule model retraining within next cycle"


class AlertManager:
    """
    Manages alert generation, notification, and tracking
    """
    
    def __init__(self):
        """Initialize alert manager"""
        self.active_alerts = {}
        self.alert_history = []
        self.alert_rules = self._initialize_alert_rules()
    
    def _initialize_alert_rules(self) -> Dict:
        """Define alert rules and thresholds"""
        return {
            "high_error_rate": {
                "metric": "error_rate",
                "threshold": 0.05,  # 5%
                "comparison": "greater",
                "severity": "high",
                "cooldown_minutes": 15
            },
            "slow_response_time": {
                "metric": "response_time.p95",
                "threshold": 2000,  # 2 seconds
                "comparison": "greater",
                "severity": "medium",
                "cooldown_minutes": 10
            },
            "low_confidence": {
                "metric": "confidence.mean",
                "threshold": 0.75,
                "comparison": "less",
                "severity": "medium",
                "cooldown_minutes": 30
            },
            "drift_detected": {
                "metric": "drift.detected",
                "threshold": True,
                "comparison": "equals",
                "severity": "high",
                "cooldown_minutes": 60
            }
        }
    
    def evaluate_alerts(
        self,
        metrics: Dict,
        drift_result: Optional[Dict] = None
    ) -> List[Alert]:
        """
        Evaluate current metrics against alert rules
        
        Args:
            metrics: Current system metrics
            drift_result: Drift detection results
        
        Returns:
            List of new alerts
        """
        new_alerts = []
        
        # Evaluate each alert rule
        for rule_name, rule in self.alert_rules.items():
            # Skip if alert is in cooldown
            if self._is_in_cooldown(rule_name):
                continue
            
            # Check if threshold exceeded
            if self._check_threshold(rule, metrics, drift_result):
                alert = self._create_alert(rule_name, rule, metrics)
                new_alerts.append(alert)
                
                # Add to active alerts
                self.active_alerts[alert.alert_id] = alert
                self.alert_history.append(alert)
                
                logger.warning(
                    f"Alert triggered: {alert.title} - {alert.description}"
                )
        
        return new_alerts
    
    def _check_threshold(
        self,
        rule: Dict,
        metrics: Dict,
        drift_result: Optional[Dict]
    ) -> bool:
        """Check if metric exceeds threshold"""
        metric_path = rule["metric"].split(".")
        
        # Handle drift separately
        if metric_path[0] == "drift":
            if not drift_result:
                return False
            return drift_result.get("drift_detected", False)
        
        # Navigate nested metric
        value = metrics
        for key in metric_path:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return False
        
        # Compare against threshold
        threshold = rule["threshold"]
        comparison = rule["comparison"]
        
        if comparison == "greater":
            return value > threshold
        elif comparison == "less":
            return value < threshold
        elif comparison == "equals":
            return value == threshold
        
        return False
    
    def _create_alert(
        self,
        rule_name: str,
        rule: Dict,
        metrics: Dict
    ) -> Alert:
        """Create alert object"""
        import uuid
        
        alert_id = f"{rule_name}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Get current metric value
        metric_path = rule["metric"].split(".")
        current_value = metrics
        for key in metric_path:
            if isinstance(current_value, dict):
                current_value = current_value.get(key, 0)
        
        return Alert(
            alert_id=alert_id,
            severity=rule["severity"],
            title=self._generate_alert_title(rule_name),
            description=self._generate_alert_description(
                rule_name, 
                current_value, 
                rule["threshold"]
            ),
            metric_name=rule["metric"],
            current_value=current_value if isinstance(current_value, (int, float)) else 0,
            threshold_value=rule["threshold"] if isinstance(rule["threshold"], (int, float)) else 0,
            timestamp=datetime.utcnow()
        )
    
    def _is_in_cooldown(self, rule_name: str) -> bool:
        """Check if alert rule is in cooldown period"""
        cooldown_minutes = self.alert_rules[rule_name].get("cooldown_minutes", 0)
        
        # Find most recent alert for this rule
        recent_alerts = [
            a for a in self.alert_history
            if rule_name in a.alert_id
        ]
        
        if not recent_alerts:
            return False
        
        most_recent = max(recent_alerts, key=lambda x: x.timestamp)
        time_since_alert = datetime.utcnow() - most_recent.timestamp
        
        return time_since_alert < timedelta(minutes=cooldown_minutes)
    
    def _generate_alert_title(self, rule_name: str) -> str:
        """Generate human-readable alert title"""
        titles = {
            "high_error_rate": "High Error Rate Detected",
            "slow_response_time": "Slow Response Times",
            "low_confidence": "Low Model Confidence",
            "drift_detected": "Model Performance Drift Detected"
        }
        return titles.get(rule_name, f"Alert: {rule_name}")
    
    def _generate_alert_description(
        self,
        rule_name: str,
        current_value: float,
        threshold: float
    ) -> str:
        """Generate detailed alert description"""
        descriptions = {
            "high_error_rate": f"Error rate ({current_value:.2%}) exceeds threshold ({threshold:.2%})",
            "slow_response_time": f"P95 response time ({current_value:.0f}ms) exceeds threshold ({threshold:.0f}ms)",
            "low_confidence": f"Average confidence ({current_value:.2f}) below threshold ({threshold:.2f})",
            "drift_detected": "Model performance has drifted from baseline - retraining recommended"
        }
        return descriptions.get(
            rule_name, 
            f"Metric {rule_name} threshold exceeded"
        )
    
    def acknowledge_alert(self, alert_id: str):
        """Acknowledge an active alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].acknowledged = True
            logger.info(f"Alert {alert_id} acknowledged")
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active unacknowledged alerts"""
        return [
            alert for alert in self.active_alerts.values()
            if not alert.acknowledged
        ]


class MonitoringService:
    """
    Main monitoring service orchestrating all components
    """
    
    def __init__(self, baseline_metrics: Dict):
        """
        Initialize monitoring service
        
        Args:
            baseline_metrics: Baseline model performance
        """
        self.metrics_collector = MetricsCollector()
        self.drift_detector = DriftDetector(baseline_metrics)
        self.alert_manager = AlertManager()
        
        logger.info("Monitoring service initialized")
    
    def record_prediction(
        self,
        response_time_ms: float,
        confidence_score: float,
        success: bool,
        metadata: Optional[Dict] = None
    ):
        """
        Record a single prediction for monitoring
        
        Args:
            response_time_ms: Processing time
            confidence_score: Model confidence
            success: Whether prediction succeeded
            metadata: Additional context
        """
        self.metrics_collector.record_request(
            response_time_ms,
            confidence_score,
            success,
            metadata
        )
    
    def check_system_health(self) -> Dict:
        """
        Perform comprehensive system health check
        
        Returns:
            System health status with metrics and alerts
        """
        # Get current metrics
        current_metrics = self.metrics_collector.get_current_metrics()
        
        # Check for drift
        drift_result = self.drift_detector.check_drift(current_metrics)
        
        # Evaluate alerts
        new_alerts = self.alert_manager.evaluate_alerts(
            current_metrics,
            drift_result
        )
        
        # Determine overall health status
        health_status = self._determine_health_status(
            current_metrics,
            drift_result,
            new_alerts
        )
        
        return {
            "status": health_status,
            "metrics": current_metrics,
            "drift": drift_result,
            "alerts": {
                "new": [self._alert_to_dict(a) for a in new_alerts],
                "active": [
                    self._alert_to_dict(a) 
                    for a in self.alert_manager.get_active_alerts()
                ]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _determine_health_status(
        self,
        metrics: Dict,
        drift_result: Dict,
        new_alerts: List[Alert]
    ) -> str:
        """Determine overall system health status"""
        # Check for critical alerts
        critical_alerts = [
            a for a in new_alerts 
            if a.severity == "critical"
        ]
        if critical_alerts:
            return "critical"
        
        # Check for high severity alerts
        high_alerts = [
            a for a in new_alerts 
            if a.severity == "high"
        ]
        if high_alerts or drift_result.get("drift_detected"):
            return "degraded"
        
        # Check error rate
        if metrics.get("error_rate", 0) > 0.02:  # 2%
            return "degraded"
        
        return "healthy"
    
    def _alert_to_dict(self, alert: Alert) -> Dict:
        """Convert Alert to dictionary"""
        return {
            "alert_id": alert.alert_id,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "metric_name": alert.metric_name,
            "current_value": alert.current_value,
            "threshold_value": alert.threshold_value,
            "timestamp": alert.timestamp.isoformat(),
            "acknowledged": alert.acknowledged
        }


# Example usage
if __name__ == "__main__":
    # Initialize with baseline metrics from training
    baseline = {
        "accuracy": 0.94,
        "confidence": 0.90,
        "response_time": 500
    }
    
    monitoring = MonitoringService(baseline)
    
    # Simulate predictions
    for i in range(100):
        monitoring.record_prediction(
            response_time_ms=450 + (i * 5),  # Gradually increasing
            confidence_score=0.88 - (i * 0.001),  # Gradually decreasing
            success=True
        )
    
    # Check health
    health = monitoring.check_system_health()
    print(f"System Status: {health['status']}")
    print(f"Active Alerts: {len(health['alerts']['active'])}")