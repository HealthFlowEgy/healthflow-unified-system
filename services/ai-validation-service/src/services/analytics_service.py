"""
Advanced Analytics and Reporting Engine
Provides insights, metrics, and predictive analytics for prescription workflows
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import logging
import statistics

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics"""
    VOLUME = "volume"
    ACCURACY = "accuracy"
    PERFORMANCE = "performance"
    QUALITY = "quality"
    CLINICAL = "clinical"
    OPERATIONAL = "operational"


class ReportPeriod(Enum):
    """Report time periods"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


@dataclass
class Metric:
    """Single metric measurement"""
    metric_type: MetricType
    name: str
    value: float
    unit: str
    timestamp: datetime
    dimensions: Dict


@dataclass
class Alert:
    """Analytics alert"""
    alert_id: str
    severity: str  # info, warning, error, critical
    title: str
    description: str
    metric_name: str
    threshold: float
    actual_value: float
    timestamp: datetime


class PrescriptionAnalytics:
    """
    Analyzes prescription processing metrics and patterns
    """
    
    def __init__(self):
        self.metrics_history: List[Metric] = []
        self.prescription_data: List[Dict] = []
    
    def record_prescription(self, prescription_data: Dict):
        """Record prescription for analytics"""
        self.prescription_data.append({
            **prescription_data,
            "recorded_at": datetime.utcnow()
        })
    
    def calculate_volume_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Calculate prescription volume metrics
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Volume metrics
        """
        period_prescriptions = [
            p for p in self.prescription_data
            if start_date <= p["recorded_at"] <= end_date
        ]
        
        # Total volume
        total = len(period_prescriptions)
        
        # Volume by status
        by_status = defaultdict(int)
        for p in period_prescriptions:
            by_status[p.get("status", "unknown")] += 1
        
        # Volume by provider
        by_provider = defaultdict(int)
        for p in period_prescriptions:
            by_provider[p.get("provider_id", "unknown")] += 1
        
        # Top providers
        top_providers = sorted(
            by_provider.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Volume by pharmacy
        by_pharmacy = defaultdict(int)
        for p in period_prescriptions:
            if p.get("pharmacy_id"):
                by_pharmacy[p["pharmacy_id"]] += 1
        
        # Daily volume trend
        daily_volumes = defaultdict(int)
        for p in period_prescriptions:
            date_key = p["recorded_at"].strftime("%Y-%m-%d")
            daily_volumes[date_key] += 1
        
        # Calculate growth rate
        days = (end_date - start_date).days
        avg_daily = total / days if days > 0 else 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "total_prescriptions": total,
            "average_daily": round(avg_daily, 1),
            "by_status": dict(by_status),
            "by_provider": {
                "total_providers": len(by_provider),
                "top_providers": [
                    {"provider_id": pid, "count": count}
                    for pid, count in top_providers
                ]
            },
            "by_pharmacy": dict(by_pharmacy),
            "daily_trend": dict(daily_volumes)
        }
    
    def calculate_accuracy_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Calculate OCR/NLP accuracy metrics
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Accuracy metrics
        """
        period_prescriptions = [
            p for p in self.prescription_data
            if start_date <= p["recorded_at"] <= end_date
            and "ocr_confidence" in p
        ]
        
        if not period_prescriptions:
            return {"error": "No data available for period"}
        
        # OCR accuracy
        ocr_confidences = [p["ocr_confidence"] for p in period_prescriptions]
        avg_ocr_confidence = statistics.mean(ocr_confidences)
        
        # NLP accuracy
        nlp_confidences = [
            p.get("nlp_confidence", 0) for p in period_prescriptions
        ]
        avg_nlp_confidence = statistics.mean(nlp_confidences) if nlp_confidences else 0
        
        # Low confidence rate
        low_confidence_count = sum(
            1 for c in ocr_confidences if c < 0.85
        )
        low_confidence_rate = low_confidence_count / len(period_prescriptions)
        
        # Error rate
        error_count = sum(
            1 for p in period_prescriptions
            if p.get("status") == "error"
        )
        error_rate = error_count / len(period_prescriptions)
        
        # Manual review rate
        manual_review_count = sum(
            1 for p in period_prescriptions
            if p.get("requires_manual_review", False)
        )
        manual_review_rate = manual_review_count / len(period_prescriptions)
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "sample_size": len(period_prescriptions),
            "ocr": {
                "average_confidence": round(avg_ocr_confidence, 3),
                "min_confidence": round(min(ocr_confidences), 3),
                "max_confidence": round(max(ocr_confidences), 3),
                "std_dev": round(statistics.stdev(ocr_confidences), 3) if len(ocr_confidences) > 1 else 0
            },
            "nlp": {
                "average_confidence": round(avg_nlp_confidence, 3)
            },
            "quality_metrics": {
                "low_confidence_rate": round(low_confidence_rate, 3),
                "error_rate": round(error_rate, 3),
                "manual_review_rate": round(manual_review_rate, 3),
                "automated_rate": round(1 - manual_review_rate, 3)
            }
        }
    
    def calculate_performance_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Calculate system performance metrics
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Performance metrics
        """
        period_prescriptions = [
            p for p in self.prescription_data
            if start_date <= p["recorded_at"] <= end_date
            and "processing_time_ms" in p
        ]
        
        if not period_prescriptions:
            return {"error": "No data available for period"}
        
        # Processing times
        processing_times = [
            p["processing_time_ms"] for p in period_prescriptions
        ]
        
        # Calculate percentiles
        sorted_times = sorted(processing_times)
        n = len(sorted_times)
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "sample_size": n,
            "processing_time_ms": {
                "mean": round(statistics.mean(processing_times), 1),
                "median": round(sorted_times[n // 2], 1),
                "p95": round(sorted_times[int(n * 0.95)], 1) if n > 0 else 0,
                "p99": round(sorted_times[int(n * 0.99)], 1) if n > 0 else 0,
                "min": round(min(processing_times), 1),
                "max": round(max(processing_times), 1)
            },
            "throughput": {
                "prescriptions_per_hour": round(n / ((end_date - start_date).total_seconds() / 3600), 1)
            }
        }
    
    def analyze_error_patterns(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Analyze error patterns and common issues
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Error analysis
        """
        period_prescriptions = [
            p for p in self.prescription_data
            if start_date <= p["recorded_at"] <= end_date
        ]
        
        errors = [p for p in period_prescriptions if p.get("status") == "error"]
        
        if not errors:
            return {
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                "total_errors": 0,
                "error_rate": 0.0
            }
        
        # Error types
        error_types = defaultdict(int)
        for p in errors:
            error_type = p.get("error_type", "unknown")
            error_types[error_type] += 1
        
        # Errors by provider
        errors_by_provider = defaultdict(int)
        for p in errors:
            provider = p.get("provider_id", "unknown")
            errors_by_provider[provider] += 1
        
        # Common error reasons
        error_reasons = defaultdict(int)
        for p in errors:
            reason = p.get("error_reason", "unknown")
            error_reasons[reason] += 1
        
        total = len(period_prescriptions)
        error_rate = len(errors) / total if total > 0 else 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_errors": len(errors),
            "total_prescriptions": total,
            "error_rate": round(error_rate, 3),
            "by_type": dict(error_types),
            "by_provider": dict(errors_by_provider),
            "common_reasons": dict(
                sorted(error_reasons.items(), key=lambda x: x[1], reverse=True)[:10]
            )
        }


class ClinicalAnalytics:
    """
    Analyzes clinical decision patterns and outcomes
    """
    
    def __init__(self):
        self.clinical_data: List[Dict] = []
    
    def record_clinical_event(self, event_data: Dict):
        """Record clinical event for analytics"""
        self.clinical_data.append({
            **event_data,
            "recorded_at": datetime.utcnow()
        })
    
    def analyze_drug_interactions(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Analyze drug interaction detections
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Drug interaction analysis
        """
        period_events = [
            e for e in self.clinical_data
            if start_date <= e["recorded_at"] <= end_date
            and e.get("event_type") == "drug_interaction"
        ]
        
        # Count by severity
        by_severity = defaultdict(int)
        for event in period_events:
            severity = event.get("severity", "unknown")
            by_severity[severity] += 1
        
        # Most common interactions
        interaction_pairs = defaultdict(int)
        for event in period_events:
            drug1 = event.get("drug1", "")
            drug2 = event.get("drug2", "")
            if drug1 and drug2:
                pair = tuple(sorted([drug1, drug2]))
                interaction_pairs[pair] += 1
        
        top_interactions = sorted(
            interaction_pairs.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_interactions_detected": len(period_events),
            "by_severity": dict(by_severity),
            "top_interactions": [
                {
                    "drugs": f"{pair[0]} + {pair[1]}",
                    "count": count
                }
                for pair, count in top_interactions
            ]
        }
    
    def analyze_prescribing_patterns(
        self,
        provider_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Analyze provider prescribing patterns
        
        Args:
            provider_id: Provider ID
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Prescribing pattern analysis
        """
        provider_events = [
            e for e in self.clinical_data
            if e.get("provider_id") == provider_id
            and start_date <= e["recorded_at"] <= end_date
        ]
        
        # Most prescribed medications
        medications = defaultdict(int)
        for event in provider_events:
            med = event.get("medication")
            if med:
                medications[med] += 1
        
        top_medications = sorted(
            medications.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Controlled substances
        controlled_count = sum(
            1 for e in provider_events
            if e.get("is_controlled", False)
        )
        
        return {
            "provider_id": provider_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_prescriptions": len(provider_events),
            "unique_medications": len(medications),
            "controlled_substances": {
                "count": controlled_count,
                "percentage": round(controlled_count / len(provider_events) * 100, 1) if provider_events else 0
            },
            "top_medications": [
                {"medication": med, "count": count}
                for med, count in top_medications
            ]
        }


class PredictiveAnalytics:
    """
    Predictive analytics for prescription workflows
    """
    
    def predict_processing_time(self, prescription_features: Dict) -> float:
        """
        Predict prescription processing time
        
        Args:
            prescription_features: Prescription characteristics
        
        Returns:
            Predicted processing time in milliseconds
        """
        # Simplified prediction model
        # In production, use trained ML model
        
        base_time = 500  # ms
        
        # Image quality factor
        if prescription_features.get("image_quality") == "low":
            base_time += 200
        
        # Handwritten vs printed
        if prescription_features.get("handwritten", False):
            base_time += 300
        
        # Number of medications
        num_meds = prescription_features.get("num_medications", 1)
        base_time += (num_meds - 1) * 100
        
        # Complex dosing
        if prescription_features.get("complex_dosing", False):
            base_time += 150
        
        return base_time
    
    def predict_fill_probability(self, prescription_features: Dict) -> float:
        """
        Predict probability prescription will be filled
        
        Args:
            prescription_features: Prescription characteristics
        
        Returns:
            Fill probability (0-1)
        """
        # Simplified prediction
        # In production, use trained ML model
        
        base_probability = 0.85
        
        # Patient history
        if prescription_features.get("patient_adherence_history") == "high":
            base_probability += 0.10
        elif prescription_features.get("patient_adherence_history") == "low":
            base_probability -= 0.20
        
        # Insurance coverage
        if not prescription_features.get("insurance_covered", True):
            base_probability -= 0.15
        
        # Cost factor
        copay = prescription_features.get("estimated_copay", 0)
        if copay > 50:
            base_probability -= 0.10
        
        return max(0, min(1, base_probability))
    
    def identify_high_risk_prescriptions(
        self,
        prescriptions: List[Dict]
    ) -> List[Dict]:
        """
        Identify prescriptions at high risk for issues
        
        Args:
            prescriptions: List of prescriptions
        
        Returns:
            List of high-risk prescriptions with risk scores
        """
        high_risk = []
        
        for rx in prescriptions:
            risk_score = 0
            risk_factors = []
            
            # Check risk factors
            if rx.get("ocr_confidence", 1.0) < 0.80:
                risk_score += 30
                risk_factors.append("Low OCR confidence")
            
            if rx.get("critical_medication", False):
                risk_score += 25
                risk_factors.append("Critical medication")
            
            if rx.get("drug_interactions", 0) > 0:
                risk_score += 20
                risk_factors.append("Drug interactions")
            
            if rx.get("unusual_dosage", False):
                risk_score += 15
                risk_factors.append("Unusual dosage")
            
            if rx.get("patient_age", 0) > 75:
                risk_score += 10
                risk_factors.append("Elderly patient")
            
            if risk_score >= 40:  # High risk threshold
                high_risk.append({
                    "prescription_id": rx.get("id"),
                    "risk_score": risk_score,
                    "risk_factors": risk_factors,
                    "recommendation": "Enhanced pharmacist review"
                })
        
        # Sort by risk score
        high_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return high_risk


class ReportGenerator:
    """
    Generates comprehensive analytical reports
    """
    
    def __init__(
        self,
        prescription_analytics: PrescriptionAnalytics,
        clinical_analytics: ClinicalAnalytics
    ):
        self.prescription_analytics = prescription_analytics
        self.clinical_analytics = clinical_analytics
    
    def generate_executive_summary(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Generate executive summary report
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Executive summary
        """
        # Get metrics
        volume = self.prescription_analytics.calculate_volume_metrics(
            start_date, end_date
        )
        accuracy = self.prescription_analytics.calculate_accuracy_metrics(
            start_date, end_date
        )
        performance = self.prescription_analytics.calculate_performance_metrics(
            start_date, end_date
        )
        errors = self.prescription_analytics.analyze_error_patterns(
            start_date, end_date
        )
        
        return {
            "report_type": "executive_summary",
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "key_metrics": {
                "total_prescriptions": volume["total_prescriptions"],
                "average_daily": volume["average_daily"],
                "ocr_accuracy": accuracy.get("ocr", {}).get("average_confidence", 0),
                "automated_rate": accuracy.get("quality_metrics", {}).get("automated_rate", 0),
                "error_rate": errors["error_rate"],
                "avg_processing_time_ms": performance.get("processing_time_ms", {}).get("mean", 0)
            },
            "trends": {
                "volume_by_day": volume.get("daily_trend", {}),
                "top_providers": volume.get("by_provider", {}).get("top_providers", [])
            },
            "quality": {
                "manual_review_rate": accuracy.get("quality_metrics", {}).get("manual_review_rate", 0),
                "low_confidence_rate": accuracy.get("quality_metrics", {}).get("low_confidence_rate", 0)
            },
            "performance": {
                "p95_latency_ms": performance.get("processing_time_ms", {}).get("p95", 0),
                "throughput_per_hour": performance.get("throughput", {}).get("prescriptions_per_hour", 0)
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_clinical_quality_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Generate clinical quality report
        
        Args:
            start_date: Start of period
            end_date: End of period
        
        Returns:
            Clinical quality report
        """
        interactions = self.clinical_analytics.analyze_drug_interactions(
            start_date, end_date
        )
        
        return {
            "report_type": "clinical_quality",
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "drug_interactions": interactions,
            "safety_metrics": {
                "interaction_detection_rate": "95%",  # Placeholder
                "contraindication_catches": 42,  # Placeholder
                "dosing_alerts": 38  # Placeholder
            },
            "generated_at": datetime.utcnow().isoformat()
        }


# Example usage
if __name__ == "__main__":
    # Initialize analytics services
    prescription_analytics = PrescriptionAnalytics()
    clinical_analytics = ClinicalAnalytics()
    predictive_analytics = PredictiveAnalytics()
    report_generator = ReportGenerator(prescription_analytics, clinical_analytics)
    
    # Simulate data collection
    import random
    start_date = datetime.utcnow() - timedelta(days=30)
    end_date = datetime.utcnow()
    
    for i in range(100):
        prescription_analytics.record_prescription({
            "id": f"RX-{i}",
            "provider_id": f"PROV-{random.randint(1, 10)}",
            "pharmacy_id": f"PHARM-{random.randint(1, 5)}",
            "status": random.choice(["completed", "completed", "completed", "error"]),
            "ocr_confidence": random.uniform(0.75, 0.99),
            "nlp_confidence": random.uniform(0.80, 0.99),
            "processing_time_ms": random.uniform(300, 800),
            "requires_manual_review": random.choice([True, False, False, False])
        })
    
    # Generate volume metrics
    volume_metrics = prescription_analytics.calculate_volume_metrics(start_date, end_date)
    print("Volume Metrics:")
    print(f"  Total: {volume_metrics['total_prescriptions']}")
    print(f"  Daily Average: {volume_metrics['average_daily']}")
    
    # Generate accuracy metrics
    accuracy_metrics = prescription_analytics.calculate_accuracy_metrics(start_date, end_date)
    print("\nAccuracy Metrics:")
    print(f"  OCR Confidence: {accuracy_metrics['ocr']['average_confidence']}")
    print(f"  Automated Rate: {accuracy_metrics['quality_metrics']['automated_rate']}")
    
    # Generate executive summary
    summary = report_generator.generate_executive_summary(start_date, end_date)
    print("\nExecutive Summary:")
    print(f"  Total Prescriptions: {summary['key_metrics']['total_prescriptions']}")
    print(f"  OCR Accuracy: {summary['key_metrics']['ocr_accuracy']:.3f}")
    print(f"  Error Rate: {summary['key_metrics']['error_rate']:.3f}")