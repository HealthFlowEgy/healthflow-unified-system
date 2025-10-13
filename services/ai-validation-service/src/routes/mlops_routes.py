"""
MLOps API Routes

RESTful API endpoints for model management, monitoring, and A/B testing.

Author: HealthFlow ML Engineering Team
Date: 2025-10-28
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from typing import Optional
try:
    from services.mlflow_registry_service import MLflowRegistryService, ModelStage
    from services.model_monitoring_service import ModelMonitoringService, MetricType
    from services.drift_detection_service import DriftDetectionService, ABTestService
    from services.auth_service import require_auth, require_role
except ImportError:
    from src.services.mlflow_registry_service import MLflowRegistryService, ModelStage
    from src.services.model_monitoring_service import ModelMonitoringService, MetricType
    from src.services.drift_detection_service import DriftDetectionService, ABTestService
    from src.services.auth_service import require_auth, require_role
import logging

logger = logging.getLogger(__name__)

# Create blueprint
mlops_bp = Blueprint('mlops', __name__, url_prefix='/api/mlops')

# Initialize services
registry_service = MLflowRegistryService()
monitoring_service = ModelMonitoringService()
drift_service = DriftDetectionService()
ab_test_service = ABTestService()


# ============================================================================
# Model Registry Endpoints
# ============================================================================

@mlops_bp.route('/models', methods=['GET'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def list_models():
    """
    List all registered models
    
    Returns:
        200: List of models with metadata
        500: Server error
    """
    try:
        models = registry_service.list_models()
        return jsonify({
            'success': True,
            'models': models,
            'count': len(models)
        }), 200
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@mlops_bp.route('/models/<model_name>/versions', methods=['GET'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def list_model_versions(model_name: str):
    """
    List all versions of a specific model
    
    Args:
        model_name: Name of the model
        
    Returns:
        200: List of model versions
        404: Model not found
        500: Server error
    """
    try:
        versions = registry_service.list_model_versions(model_name)
        return jsonify({
            'success': True,
            'model_name': model_name,
            'versions': versions,
            'count': len(versions)
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Error listing model versions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@mlops_bp.route('/models/<model_name>/versions/<int:version>/promote', methods=['POST'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def promote_model(model_name: str, version: int):
    """
    Promote a model version to a new stage
    
    Args:
        model_name: Name of the model
        version: Version number
        
    Body:
        stage: Target stage (staging, production, archived)
        
    Returns:
        200: Model promoted successfully
        400: Invalid stage
        404: Model not found
        500: Server error
    """
    try:
        data = request.get_json()
        stage = data.get('stage')
        
        if not stage:
            return jsonify({
                'success': False,
                'error': 'Stage is required'
            }), 400
        
        # Convert string to ModelStage enum
        try:
            stage_enum = ModelStage[stage.upper()]
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Invalid stage: {stage}'
            }), 400
        
        registry_service.transition_model_stage(model_name, version, stage_enum)
        
        return jsonify({
            'success': True,
            'message': f'Model {model_name} v{version} promoted to {stage}',
            'model_name': model_name,
            'version': version,
            'stage': stage
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Error promoting model: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# Model Monitoring Endpoints
# ============================================================================

@mlops_bp.route('/monitoring/metrics', methods=['GET'])
@require_auth
@require_role(['ml_engineer', 'admin', 'data_scientist'])
def get_monitoring_metrics():
    """
    Get aggregated monitoring metrics
    
    Query Parameters:
        model_name: Filter by model name
        model_version: Filter by model version
        metric_type: Filter by metric type
        hours: Time window in hours (default: 24)
        
    Returns:
        200: Aggregated metrics
        500: Server error
    """
    try:
        model_name = request.args.get('model_name')
        model_version = request.args.get('model_version', type=int)
        metric_type_str = request.args.get('metric_type')
        hours = request.args.get('hours', default=24, type=int)
        
        # Convert metric type string to enum
        metric_type = None
        if metric_type_str:
            try:
                metric_type = MetricType[metric_type_str.upper()]
            except KeyError:
                return jsonify({
                    'success': False,
                    'error': f'Invalid metric type: {metric_type_str}'
                }), 400
        
        metrics = monitoring_service.get_aggregated_metrics(
            model_name=model_name,
            model_version=model_version,
            metric_type=metric_type,
            hours=hours
        )
        
        return jsonify({
            'success': True,
            'metrics': metrics,
            'time_window_hours': hours
        }), 200
    except Exception as e:
        logger.error(f"Error getting monitoring metrics: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@mlops_bp.route('/monitoring/alerts', methods=['GET'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def get_active_alerts():
    """
    Get active monitoring alerts
    
    Query Parameters:
        model_name: Filter by model name
        severity: Filter by severity (low, medium, high, critical)
        
    Returns:
        200: List of active alerts
        500: Server error
    """
    try:
        model_name = request.args.get('model_name')
        severity = request.args.get('severity')
        
        alerts = monitoring_service.get_active_alerts(
            model_name=model_name,
            severity=severity
        )
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'count': len(alerts)
        }), 200
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# Drift Detection Endpoints
# ============================================================================

@mlops_bp.route('/drift/check', methods=['POST'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def check_drift():
    """
    Check for data or prediction drift
    
    Body:
        model_name: Name of the model
        model_version: Version of the model
        drift_type: Type of drift (data, prediction)
        
    Returns:
        200: Drift analysis results
        400: Invalid request
        500: Server error
    """
    try:
        data = request.get_json()
        model_name = data.get('model_name')
        model_version = data.get('model_version')
        drift_type = data.get('drift_type', 'data')
        
        if not model_name or not model_version:
            return jsonify({
                'success': False,
                'error': 'model_name and model_version are required'
            }), 400
        
        if drift_type == 'data':
            drift_result = drift_service.check_data_drift(model_name, model_version)
        elif drift_type == 'prediction':
            drift_result = drift_service.check_prediction_drift(model_name, model_version)
        else:
            return jsonify({
                'success': False,
                'error': f'Invalid drift_type: {drift_type}'
            }), 400
        
        return jsonify({
            'success': True,
            'drift_detected': drift_result['drift_detected'],
            'drift_score': drift_result['drift_score'],
            'details': drift_result
        }), 200
    except Exception as e:
        logger.error(f"Error checking drift: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# A/B Testing Endpoints
# ============================================================================

@mlops_bp.route('/ab-tests', methods=['POST'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def create_ab_test():
    """
    Create a new A/B test
    
    Body:
        test_name: Name of the test
        champion_model: Name of champion model
        champion_version: Version of champion model
        challenger_model: Name of challenger model
        challenger_version: Version of challenger model
        traffic_split: Traffic split ratio (default: 0.5)
        
    Returns:
        201: A/B test created
        400: Invalid request
        500: Server error
    """
    try:
        data = request.get_json()
        test_name = data.get('test_name')
        champion_model = data.get('champion_model')
        champion_version = data.get('champion_version')
        challenger_model = data.get('challenger_model')
        challenger_version = data.get('challenger_version')
        traffic_split = data.get('traffic_split', 0.5)
        
        if not all([test_name, champion_model, champion_version, challenger_model, challenger_version]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        test_id = ab_test_service.create_ab_test(
            test_name=test_name,
            champion_model=champion_model,
            champion_version=champion_version,
            challenger_model=challenger_model,
            challenger_version=challenger_version,
            traffic_split=traffic_split
        )
        
        return jsonify({
            'success': True,
            'test_id': test_id,
            'message': 'A/B test created successfully'
        }), 201
    except Exception as e:
        logger.error(f"Error creating A/B test: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@mlops_bp.route('/ab-tests/<int:test_id>/results', methods=['GET'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def get_ab_test_results(test_id: int):
    """
    Get A/B test results
    
    Args:
        test_id: ID of the A/B test
        
    Returns:
        200: Test results
        404: Test not found
        500: Server error
    """
    try:
        results = ab_test_service.get_test_results(test_id)
        
        if not results:
            return jsonify({
                'success': False,
                'error': 'Test not found'
            }), 404
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
    except Exception as e:
        logger.error(f"Error getting A/B test results: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@mlops_bp.route('/ab-tests/<int:test_id>/stop', methods=['POST'])
@require_auth
@require_role(['ml_engineer', 'admin'])
def stop_ab_test(test_id: int):
    """
    Stop an active A/B test
    
    Args:
        test_id: ID of the A/B test
        
    Body:
        winner: Which model won (champion, challenger)
        
    Returns:
        200: Test stopped
        400: Invalid request
        404: Test not found
        500: Server error
    """
    try:
        data = request.get_json()
        winner = data.get('winner')
        
        if winner not in ['champion', 'challenger']:
            return jsonify({
                'success': False,
                'error': 'Winner must be either "champion" or "challenger"'
            }), 400
        
        ab_test_service.stop_test(test_id, winner)
        
        return jsonify({
            'success': True,
            'message': f'A/B test stopped. Winner: {winner}'
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 404
    except Exception as e:
        logger.error(f"Error stopping A/B test: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Error handlers
@mlops_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404


@mlops_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

