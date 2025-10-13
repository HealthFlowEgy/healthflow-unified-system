"""
MLflow Model Registry Service for HealthFlow AI
Handles model versioning, deployment, and lifecycle management
"""

import mlflow
import mlflow.pytorch
from mlflow.tracking import MlflowClient
from typing import Dict, Optional, List
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Manages ML model lifecycle with MLflow
    - Model versioning and registration
    - Stage transitions (Staging, Production, Archived)
    - Model metadata and performance tracking
    """
    
    def __init__(self, tracking_uri: str = "http://mlflow:5000"):
        """
        Initialize MLflow client
        
        Args:
            tracking_uri: MLflow tracking server URI
        """
        mlflow.set_tracking_uri(tracking_uri)
        self.client = MlflowClient()
        self.experiment_name = "prescription-ocr-validation"
        
        # Create experiment if doesn't exist
        try:
            self.experiment_id = self.client.create_experiment(self.experiment_name)
        except:
            self.experiment_id = self.client.get_experiment_by_name(
                self.experiment_name
            ).experiment_id
    
    def register_model(
        self,
        model,
        model_name: str,
        model_type: str,  # "ocr" or "nlp"
        metrics: Dict[str, float],
        parameters: Dict[str, any],
        artifacts: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Register a new model version with MLflow
        
        Args:
            model: Trained model object
            model_name: Name for model registration
            model_type: Type of model (ocr/nlp)
            metrics: Performance metrics
            parameters: Model hyperparameters
            artifacts: Additional artifacts (configs, etc.)
        
        Returns:
            Model version number
        """
        with mlflow.start_run(experiment_id=self.experiment_id) as run:
            # Log parameters
            mlflow.log_params(parameters)
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log model type as tag
            mlflow.set_tag("model_type", model_type)
            mlflow.set_tag("registered_at", datetime.utcnow().isoformat())
            
            # Log additional artifacts
            if artifacts:
                for name, path in artifacts.items():
                    mlflow.log_artifact(path, artifact_path=name)
            
            # Register model
            if model_type == "ocr":
                mlflow.pytorch.log_model(
                    model,
                    "model",
                    registered_model_name=model_name
                )
            elif model_type == "nlp":
                mlflow.sklearn.log_model(
                    model,
                    "model",
                    registered_model_name=model_name
                )
            
            # Get version
            model_version = self.client.search_model_versions(
                f"name='{model_name}'"
            )[0].version
            
            logger.info(
                f"Registered {model_name} version {model_version} "
                f"with metrics: {metrics}"
            )
            
            return model_version
    
    def transition_model_stage(
        self,
        model_name: str,
        version: str,
        stage: str,
        archive_existing: bool = True
    ):
        """
        Transition model to new stage (Staging/Production/Archived)
        
        Args:
            model_name: Name of registered model
            version: Version to transition
            stage: Target stage
            archive_existing: Archive existing production models
        """
        # Archive existing production models if requested
        if archive_existing and stage == "Production":
            existing_prod_models = self.client.get_latest_versions(
                model_name,
                stages=["Production"]
            )
            
            for model in existing_prod_models:
                self.client.transition_model_version_stage(
                    name=model_name,
                    version=model.version,
                    stage="Archived"
                )
                logger.info(
                    f"Archived {model_name} version {model.version}"
                )
        
        # Transition to new stage
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage
        )
        
        logger.info(
            f"Transitioned {model_name} version {version} to {stage}"
        )
    
    def load_production_model(self, model_name: str):
        """
        Load current production model
        
        Args:
            model_name: Name of registered model
        
        Returns:
            Loaded model object
        """
        try:
            model_uri = f"models:/{model_name}/Production"
            model = mlflow.pyfunc.load_model(model_uri)
            
            # Get model version info
            version_info = self.client.get_latest_versions(
                model_name,
                stages=["Production"]
            )[0]
            
            logger.info(
                f"Loaded {model_name} version {version_info.version} "
                f"from Production"
            )
            
            return model, version_info
        
        except Exception as e:
            logger.error(f"Failed to load production model: {e}")
            raise
    
    def get_model_metrics(
        self,
        model_name: str,
        version: Optional[str] = None,
        stage: Optional[str] = None
    ) -> Dict:
        """
        Get metrics for specific model version or stage
        
        Args:
            model_name: Name of registered model
            version: Specific version (optional)
            stage: Stage name (optional)
        
        Returns:
            Dictionary of metrics
        """
        if version:
            model_version = self.client.get_model_version(model_name, version)
        elif stage:
            model_version = self.client.get_latest_versions(
                model_name,
                stages=[stage]
            )[0]
        else:
            raise ValueError("Must specify either version or stage")
        
        # Get run info
        run = self.client.get_run(model_version.run_id)
        
        return {
            "version": model_version.version,
            "stage": model_version.current_stage,
            "metrics": run.data.metrics,
            "parameters": run.data.params,
            "created_at": datetime.fromtimestamp(
                model_version.creation_timestamp / 1000
            ).isoformat()
        }
    
    def compare_models(
        self,
        model_name: str,
        versions: List[str]
    ) -> Dict:
        """
        Compare performance metrics across model versions
        
        Args:
            model_name: Name of registered model
            versions: List of version numbers to compare
        
        Returns:
            Comparison dictionary
        """
        comparison = {
            "model_name": model_name,
            "versions": {}
        }
        
        for version in versions:
            metrics = self.get_model_metrics(model_name, version=version)
            comparison["versions"][version] = metrics
        
        return comparison


class ModelPerformanceTracker:
    """
    Tracks model performance in production
    - Online metrics collection
    - Drift detection
    - Performance degradation alerts
    """
    
    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.metrics_buffer = []
        self.buffer_size = 1000
    
    def log_prediction(
        self,
        model_name: str,
        model_version: str,
        input_data: Dict,
        prediction: Dict,
        ground_truth: Optional[Dict] = None
    ):
        """
        Log individual prediction for performance tracking
        
        Args:
            model_name: Name of model
            model_version: Version used for prediction
            input_data: Input features (anonymized)
            prediction: Model output
            ground_truth: Actual value if available
        """
        metric_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "model_version": model_version,
            "confidence": prediction.get("confidence", 0.0),
            "prediction_time_ms": prediction.get("latency_ms", 0),
            "ground_truth_available": ground_truth is not None
        }
        
        # Calculate accuracy if ground truth available
        if ground_truth:
            metric_entry["correct"] = (
                prediction.get("result") == ground_truth.get("result")
            )
        
        self.metrics_buffer.append(metric_entry)
        
        # Flush buffer if full
        if len(self.metrics_buffer) >= self.buffer_size:
            self._flush_metrics()
    
    def _flush_metrics(self):
        """Flush metrics buffer to MLflow"""
        if not self.metrics_buffer:
            return
        
        # Aggregate metrics
        avg_confidence = sum(
            m["confidence"] for m in self.metrics_buffer
        ) / len(self.metrics_buffer)
        
        avg_latency = sum(
            m["prediction_time_ms"] for m in self.metrics_buffer
        ) / len(self.metrics_buffer)
        
        # Calculate accuracy if ground truth available
        accuracy_metrics = [
            m for m in self.metrics_buffer 
            if m["ground_truth_available"]
        ]
        
        if accuracy_metrics:
            accuracy = sum(
                m["correct"] for m in accuracy_metrics
            ) / len(accuracy_metrics)
        else:
            accuracy = None
        
        # Log to MLflow
        with mlflow.start_run(experiment_id=self.registry.experiment_id):
            mlflow.log_metric("avg_confidence", avg_confidence)
            mlflow.log_metric("avg_latency_ms", avg_latency)
            if accuracy is not None:
                mlflow.log_metric("online_accuracy", accuracy)
            
            mlflow.set_tag("metric_type", "production_monitoring")
            mlflow.set_tag("sample_size", len(self.metrics_buffer))
        
        logger.info(
            f"Flushed {len(self.metrics_buffer)} metrics. "
            f"Avg confidence: {avg_confidence:.3f}, "
            f"Avg latency: {avg_latency:.1f}ms"
        )
        
        # Clear buffer
        self.metrics_buffer = []
    
    def detect_drift(
        self,
        model_name: str,
        current_metrics: Dict,
        baseline_metrics: Dict,
        threshold: float = 0.1
    ) -> Dict:
        """
        Detect model performance drift
        
        Args:
            model_name: Name of model
            current_metrics: Recent performance metrics
            baseline_metrics: Baseline (training) metrics
            threshold: Acceptable drift threshold
        
        Returns:
            Drift detection results
        """
        drift_detected = False
        drift_details = {}
        
        for metric_name in ["accuracy", "precision", "recall"]:
            if metric_name in current_metrics and metric_name in baseline_metrics:
                current_val = current_metrics[metric_name]
                baseline_val = baseline_metrics[metric_name]
                
                drift = abs(current_val - baseline_val)
                drift_pct = (drift / baseline_val) * 100
                
                if drift > threshold:
                    drift_detected = True
                    drift_details[metric_name] = {
                        "current": current_val,
                        "baseline": baseline_val,
                        "drift": drift,
                        "drift_percentage": drift_pct
                    }
        
        result = {
            "model_name": model_name,
            "drift_detected": drift_detected,
            "timestamp": datetime.utcnow().isoformat(),
            "details": drift_details
        }
        
        if drift_detected:
            logger.warning(
                f"Drift detected for {model_name}: {drift_details}"
            )
        
        return result


# Example usage
if __name__ == "__main__":
    # Initialize registry
    registry = ModelRegistry()
    
    # Register a model (example)
    # model = load_trained_model()
    # version = registry.register_model(
    #     model=model,
    #     model_name="prescription-ocr-v1",
    #     model_type="ocr",
    #     metrics={"accuracy": 0.94, "precision": 0.92},
    #     parameters={"learning_rate": 0.001, "batch_size": 32}
    # )
    
    # Transition to production
    # registry.transition_model_stage(
    #     model_name="prescription-ocr-v1",
    #     version=version,
    #     stage="Production"
    # )
    
    # Load production model
    # model, version_info = registry.load_production_model(
    #     "prescription-ocr-v1"
    # )
    
    print("Model registry service initialized")