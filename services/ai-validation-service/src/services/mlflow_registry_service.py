"""
MLflow Model Registry Service

Manages model versioning, registration, and deployment lifecycle for all AI models.
Integrates with MLflow tracking server for experiment tracking and model registry.

Author: HealthFlow ML Engineering Team
Date: 2025-10-28
"""

import os
import mlflow
import mlflow.pytorch
import mlflow.sklearn
from mlflow.tracking import MlflowClient
from mlflow.models.signature import infer_signature
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from enum import Enum
import logging
import json

logger = logging.getLogger(__name__)


class ModelStage(str, Enum):
    """MLflow model stages"""
    STAGING = "Staging"
    PRODUCTION = "Production"
    ARCHIVED = "Archived"
    NONE = "None"


class ModelType(str, Enum):
    """Types of models in the system"""
    OCR = "ocr_model"
    NLP = "nlp_model"
    VALIDATION = "validation_model"
    DRUG_INTERACTION = "drug_interaction_model"


class MLflowModelService:
    """
    Service for managing ML models with MLflow
    
    Handles:
    - Model registration and versioning
    - Model promotion through stages
    - Model metadata and tagging
    - Model deployment and serving
    """
    
    def __init__(self, tracking_uri: Optional[str] = None):
        """
        Initialize MLflow service
        
        Args:
            tracking_uri: MLflow tracking server URI (default: from env)
        """
        self.tracking_uri = tracking_uri or os.getenv(
            'MLFLOW_TRACKING_URI',
            'http://localhost:5000'
        )
        mlflow.set_tracking_uri(self.tracking_uri)
        self.client = MlflowClient(self.tracking_uri)
        self.logger = logging.getLogger(__name__)
        
        self.logger.info(f"Initialized MLflow service with tracking URI: {self.tracking_uri}")
    
    def register_model(
        self,
        model,
        model_name: str,
        model_type: ModelType,
        framework: str,
        metrics: Dict[str, float],
        parameters: Dict[str, Any],
        tags: Optional[Dict[str, str]] = None,
        signature=None,
        input_example=None
    ) -> str:
        """
        Register a new model version in MLflow
        
        Args:
            model: The trained model object
            model_name: Name for the model (e.g., "donut-ocr-v1")
            model_type: Type of model (OCR, NLP, etc.)
            framework: ML framework (pytorch, sklearn, tensorflow)
            metrics: Performance metrics dict
            parameters: Model hyperparameters
            tags: Additional metadata tags
            signature: MLflow model signature
            input_example: Example input for the model
        
        Returns:
            Model version string (e.g., "1")
        """
        # Start MLflow run
        with mlflow.start_run(run_name=f"{model_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"):
            
            # Log parameters
            mlflow.log_params(parameters)
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log tags
            base_tags = {
                'model_type': model_type.value,
                'framework': framework,
                'registered_at': datetime.utcnow().isoformat(),
                'registered_by': os.getenv('USER', 'system')
            }
            if tags:
                base_tags.update(tags)
            
            mlflow.set_tags(base_tags)
            
            # Log model based on framework
            if framework == 'pytorch':
                model_info = mlflow.pytorch.log_model(
                    pytorch_model=model,
                    artifact_path="model",
                    registered_model_name=model_name,
                    signature=signature,
                    input_example=input_example
                )
            elif framework == 'sklearn':
                model_info = mlflow.sklearn.log_model(
                    sk_model=model,
                    artifact_path="model",
                    registered_model_name=model_name,
                    signature=signature,
                    input_example=input_example
                )
            elif framework == 'transformers':
                # For Hugging Face transformers
                mlflow.transformers.log_model(
                    transformers_model=model,
                    artifact_path="model",
                    registered_model_name=model_name,
                    signature=signature,
                    input_example=input_example
                )
            else:
                raise ValueError(f"Unsupported framework: {framework}")
            
            # Get the model version
            model_version = model_info.registered_model_version
            
            # Add model version description
            self.client.update_model_version(
                name=model_name,
                version=model_version,
                description=f"Model registered on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n"
                           f"Type: {model_type.value}\n"
                           f"Framework: {framework}\n"
                           f"Metrics: {json.dumps(metrics, indent=2)}"
            )
            
            self.logger.info(
                f"Registered {model_name} version {model_version} "
                f"with metrics: {metrics}"
            )
            
            return model_version
    
    def promote_model(
        self,
        model_name: str,
        version: str,
        stage: ModelStage,
        archive_existing: bool = True
    ) -> None:
        """
        Promote a model version to a specific stage
        
        Args:
            model_name: Name of the registered model
            version: Model version to promote
            stage: Target stage (Staging, Production, Archived)
            archive_existing: Whether to archive existing production models
        """
        # If promoting to production, archive existing production models
        if stage == ModelStage.PRODUCTION and archive_existing:
            existing_prod_versions = self.client.get_latest_versions(
                model_name,
                stages=[ModelStage.PRODUCTION.value]
            )
            
            for mv in existing_prod_versions:
                self.client.transition_model_version_stage(
                    name=model_name,
                    version=mv.version,
                    stage=ModelStage.ARCHIVED.value
                )
                self.logger.info(
                    f"Archived {model_name} version {mv.version} "
                    f"(previously in Production)"
                )
        
        # Promote the specified version
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage.value
        )
        
        self.logger.info(
            f"Promoted {model_name} version {version} to {stage.value}"
        )
    
    def load_model(
        self,
        model_name: str,
        stage: ModelStage = ModelStage.PRODUCTION,
        version: Optional[str] = None
    ):
        """
        Load a model from MLflow registry
        
        Args:
            model_name: Name of the registered model
            stage: Stage to load from (Production, Staging)
            version: Specific version (overrides stage)
        
        Returns:
            Loaded model object
        """
        if version:
            model_uri = f"models:/{model_name}/{version}"
        else:
            model_uri = f"models:/{model_name}/{stage.value}"
        
        # Load model (MLflow auto-detects the framework)
        model = mlflow.pyfunc.load_model(model_uri)
        
        self.logger.info(
            f"Loaded {model_name} "
            f"{'version ' + version if version else 'from ' + stage.value}"
        )
        
        return model
    
    def get_model_metadata(
        self,
        model_name: str,
        version: Optional[str] = None,
        stage: Optional[ModelStage] = None
    ) -> Dict[str, Any]:
        """
        Get metadata for a model version
        
        Args:
            model_name: Name of the registered model
            version: Specific version (optional)
            stage: Stage to get latest from (optional)
        
        Returns:
            Dictionary with model metadata
        """
        if version:
            model_version = self.client.get_model_version(model_name, version)
        elif stage:
            versions = self.client.get_latest_versions(model_name, stages=[stage.value])
            if not versions:
                raise ValueError(f"No model found in {stage.value} stage")
            model_version = versions[0]
        else:
            # Get latest version
            versions = self.client.search_model_versions(f"name='{model_name}'")
            if not versions:
                raise ValueError(f"No versions found for model {model_name}")
            model_version = max(versions, key=lambda v: int(v.version))
        
        # Get run data for metrics and params
        run = self.client.get_run(model_version.run_id)
        
        return {
            'model_name': model_name,
            'version': model_version.version,
            'stage': model_version.current_stage,
            'status': model_version.status,
            'created_at': model_version.creation_timestamp,
            'last_updated': model_version.last_updated_timestamp,
            'run_id': model_version.run_id,
            'source': model_version.source,
            'description': model_version.description,
            'tags': model_version.tags,
            'metrics': run.data.metrics,
            'params': run.data.params
        }
    
    def compare_models(
        self,
        model_name: str,
        version1: str,
        version2: str
    ) -> Dict[str, Any]:
        """
        Compare two model versions
        
        Args:
            model_name: Name of the registered model
            version1: First version to compare
            version2: Second version to compare
        
        Returns:
            Comparison dictionary
        """
        metadata1 = self.get_model_metadata(model_name, version=version1)
        metadata2 = self.get_model_metadata(model_name, version=version2)
        
        # Compare metrics
        metrics_comparison = {}
        all_metrics = set(metadata1['metrics'].keys()) | set(metadata2['metrics'].keys())
        
        for metric in all_metrics:
            val1 = metadata1['metrics'].get(metric, 0)
            val2 = metadata2['metrics'].get(metric, 0)
            diff = val2 - val1
            pct_change = (diff / val1 * 100) if val1 != 0 else float('inf')
            
            metrics_comparison[metric] = {
                f'version_{version1}': val1,
                f'version_{version2}': val2,
                'difference': diff,
                'percent_change': pct_change,
                'improved': diff > 0 if 'accuracy' in metric.lower() or 'score' in metric.lower() else diff < 0
            }
        
        return {
            'model_name': model_name,
            'version1': {
                'version': version1,
                'stage': metadata1['stage'],
                'created_at': metadata1['created_at']
            },
            'version2': {
                'version': version2,
                'stage': metadata2['stage'],
                'created_at': metadata2['created_at']
            },
            'metrics_comparison': metrics_comparison,
            'parameters_diff': {
                k: {
                    'version1': metadata1['params'].get(k),
                    'version2': metadata2['params'].get(k)
                }
                for k in set(metadata1['params'].keys()) | set(metadata2['params'].keys())
                if metadata1['params'].get(k) != metadata2['params'].get(k)
            }
        }
    
    def list_models(
        self,
        model_type: Optional[ModelType] = None
    ) -> List[Dict[str, Any]]:
        """
        List all registered models
        
        Args:
            model_type: Filter by model type (optional)
        
        Returns:
            List of model metadata dictionaries
        """
        # Get all registered models
        models = self.client.search_registered_models()
        
        model_list = []
        for model in models:
            # Get latest version
            latest_versions = self.client.get_latest_versions(model.name)
            
            if latest_versions:
                latest = max(latest_versions, key=lambda v: int(v.version))
                
                # Filter by model type if specified
                if model_type and latest.tags.get('model_type') != model_type.value:
                    continue
                
                model_list.append({
                    'name': model.name,
                    'latest_version': latest.version,
                    'stage': latest.current_stage,
                    'created_at': model.creation_timestamp,
                    'last_updated': model.last_updated_timestamp,
                    'description': model.description,
                    'tags': latest.tags
                })
        
        return model_list
    
    def delete_model_version(
        self,
        model_name: str,
        version: str
    ) -> None:
        """
        Delete a specific model version
        
        Args:
            model_name: Name of the registered model
            version: Version to delete
        """
        self.client.delete_model_version(model_name, version)
        self.logger.info(f"Deleted {model_name} version {version}")
    
    def search_models(
        self,
        filter_string: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Search for models with filters
        
        Args:
            filter_string: MLflow filter string
            max_results: Maximum number of results
        
        Returns:
            List of matching models
        """
        models = self.client.search_registered_models(
            filter_string=filter_string,
            max_results=max_results
        )
        
        return [
            {
                'name': model.name,
                'creation_timestamp': model.creation_timestamp,
                'last_updated_timestamp': model.last_updated_timestamp,
                'description': model.description
            }
            for model in models
        ]
    
    def add_model_alias(
        self,
        model_name: str,
        version: str,
        alias: str
    ) -> None:
        """
        Add an alias to a model version
        
        Args:
            model_name: Name of the registered model
            version: Version to alias
            alias: Alias name (e.g., 'champion', 'challenger')
        """
        self.client.set_registered_model_alias(
            name=model_name,
            alias=alias,
            version=version
        )
        self.logger.info(f"Added alias '{alias}' to {model_name} version {version}")
    
    def get_model_by_alias(
        self,
        model_name: str,
        alias: str
    ):
        """
        Load model by alias
        
        Args:
            model_name: Name of the registered model
            alias: Alias to load
        
        Returns:
            Loaded model object
        """
        model_uri = f"models:/{model_name}@{alias}"
        model = mlflow.pyfunc.load_model(model_uri)
        self.logger.info(f"Loaded {model_name} with alias '{alias}'")
        return model


# ============================================================================
# Model-Specific Services
# ============================================================================

class OCRModelService:
    """Service specifically for OCR models"""
    
    def __init__(self, mlflow_service: MLflowModelService):
        self.mlflow_service = mlflow_service
        self.model_name = "medical-prescription-ocr"
        self.logger = logging.getLogger(__name__)
    
    def register_donut_model(
        self,
        model,
        processor,
        accuracy: float,
        word_error_rate: float,
        training_dataset_size: int,
        epochs: int,
        learning_rate: float,
        tags: Optional[Dict[str, str]] = None
    ) -> str:
        """Register a Donut OCR model"""
        
        metrics = {
            'accuracy': accuracy,
            'word_error_rate': word_error_rate,
            'character_error_rate': word_error_rate * 0.7,  # Approximate
        }
        
        parameters = {
            'model_architecture': 'donut-transformer',
            'base_model': 'naver-clova-ix/donut-base',
            'training_dataset_size': training_dataset_size,
            'epochs': epochs,
            'learning_rate': learning_rate,
            'max_length': 512,
            'image_size': 224
        }
        
        model_tags = {
            'task': 'medical_ocr',
            'language': 'english',
            'domain': 'healthcare'
        }
        if tags:
            model_tags.update(tags)
        
        return self.mlflow_service.register_model(
            model=model,
            model_name=self.model_name,
            model_type=ModelType.OCR,
            framework='transformers',
            metrics=metrics,
            parameters=parameters,
            tags=model_tags
        )
    
    def get_production_model(self):
        """Get current production OCR model"""
        return self.mlflow_service.load_model(
            self.model_name,
            stage=ModelStage.PRODUCTION
        )


class NLPModelService:
    """Service specifically for NLP models"""
    
    def __init__(self, mlflow_service: MLflowModelService):
        self.mlflow_service = mlflow_service
        self.model_name = "medical-ner-model"
        self.logger = logging.getLogger(__name__)
    
    def register_ner_model(
        self,
        model,
        f1_score: float,
        precision: float,
        recall: float,
        entity_types: List[str],
        training_examples: int,
        tags: Optional[Dict[str, str]] = None
    ) -> str:
        """Register a Named Entity Recognition model"""
        
        metrics = {
            'f1_score': f1_score,
            'precision': precision,
            'recall': recall,
            'entity_count': len(entity_types)
        }
        
        parameters = {
            'model_type': 'transformer-ner',
            'entity_types': ','.join(entity_types),
            'training_examples': training_examples,
            'max_length': 128,
        }
        
        model_tags = {
            'task': 'named_entity_recognition',
            'domain': 'medical_prescriptions'
        }
        if tags:
            model_tags.update(tags)
        
        return self.mlflow_service.register_model(
            model=model,
            model_name=self.model_name,
            model_type=ModelType.NLP,
            framework='transformers',
            metrics=metrics,
            parameters=parameters,
            tags=model_tags
        )
    
    def get_production_model(self):
        """Get current production NLP model"""
        return self.mlflow_service.load_model(
            self.model_name,
            stage=ModelStage.PRODUCTION
        )


# ============================================================================
# Example Usage
# ============================================================================

def example_model_registration():
    """Example of registering and managing models"""
    
    # Initialize service
    mlflow_service = MLflowModelService()
    
    # Example 1: Register OCR model
    ocr_service = OCRModelService(mlflow_service)
    
    # Simulate trained model
    class MockOCRModel:
        def predict(self, image):
            return "Prescription text..."
    
    mock_model = MockOCRModel()
    
    version = ocr_service.register_donut_model(
        model=mock_model,
        processor=None,
        accuracy=0.96,
        word_error_rate=0.04,
        training_dataset_size=10000,
        epochs=30,
        learning_rate=1e-5,
        tags={'experiment': 'baseline'}
    )
    
    print(f"Registered OCR model version: {version}")
    
    # Example 2: Promote to production
    mlflow_service.promote_model(
        model_name="medical-prescription-ocr",
        version=version,
        stage=ModelStage.PRODUCTION
    )
    
    # Example 3: Compare models
    if int(version) > 1:
        comparison = mlflow_service.compare_models(
            model_name="medical-prescription-ocr",
            version1=str(int(version) - 1),
            version2=version
        )
        print("Model comparison:", comparison)
    
    # Example 4: Load production model
    prod_model = ocr_service.get_production_model()
    print("Loaded production model:", prod_model)
    
    # Example 5: List all models
    models = mlflow_service.list_models()
    print(f"Total models: {len(models)}")


if __name__ == '__main__':
    example_model_registration()