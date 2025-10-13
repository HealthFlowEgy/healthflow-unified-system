"""
Enhanced health check and metrics endpoints
File: src/routes/health_routes.py
"""

from flask import Blueprint, jsonify
from datetime import datetime
from models.database import db
from services.monitoring_service import metrics_collector, get_metrics_summary
from services.auth_service import token_required, role_required
import os

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Basic health check endpoint
    Returns service health status
    """
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    health_status = metrics_collector.get_health_status()
    
    # Overall status determination
    overall_status = 'healthy'
    if db_status != 'healthy':
        overall_status = 'unhealthy'
    elif health_status['status'] == 'degraded':
        overall_status = 'degraded'
    
    response_data = {
        'status': overall_status,
        'timestamp': datetime.utcnow().isoformat(),
        'version': os.environ.get('APP_VERSION', 'unknown'),
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'uptime_seconds': health_status['uptime_seconds'],
        'checks': {
            'database': db_status,
            'application': health_status['status']
        }
    }
    
    # Add issues if any
    if health_status.get('issues'):
        response_data['issues'] = health_status['issues']
    
    status_code = 200 if overall_status == 'healthy' else 503
    
    return jsonify(response_data), status_code


@health_bp.route('/health/detailed', methods=['GET'])
@token_required
@role_required('admin')
def detailed_health_check(current_user):
    """
    Detailed health check with system metrics
    Requires admin authentication
    """
    try:
        health_status = metrics_collector.get_health_status()
        system_metrics = metrics_collector.get_system_metrics()
        request_stats = metrics_collector.get_request_stats(minutes=60)
        error_stats = metrics_collector.get_error_stats(minutes=60)
        
        # Database health
        try:
            db.session.execute('SELECT 1')
            db_health = {
                'status': 'healthy',
                'connection_pool': {
                    'size': db.engine.pool.size(),
                    'checked_out': db.engine.pool.checkedout(),
                    'overflow': db.engine.pool.overflow(),
                }
            }
        except Exception as e:
            db_health = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        return jsonify({
            'status': 'success',
            'data': {
                'health': health_status,
                'system': system_metrics,
                'database': db_health,
                'requests': request_stats,
                'errors': error_stats,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve detailed health metrics',
            'error': str(e)
        }), 500


@health_bp.route('/metrics', methods=['GET'])
@token_required
@role_required('admin')
def get_metrics(current_user):
    """
    Get application metrics
    Requires admin authentication
    """
    try:
        metrics = get_metrics_summary()
        
        return jsonify({
            'status': 'success',
            'data': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve metrics',
            'error': str(e)
        }), 500


@health_bp.route('/readiness', methods=['GET'])
def readiness_check():
    """
    Kubernetes-style readiness probe
    Checks if application is ready to receive traffic
    """
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        
        # Check critical dependencies
        ready = True
        checks = {
            'database': 'ready'
        }
        
        # Add more dependency checks here (Redis, external APIs, etc.)
        
        return jsonify({
            'ready': ready,
            'checks': checks,
            'timestamp': datetime.utcnow().isoformat()
        }), 200 if ready else 503
        
    except Exception as e:
        return jsonify({
            'ready': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@health_bp.route('/liveness', methods=['GET'])
def liveness_check():
    """
    Kubernetes-style liveness probe
    Checks if application is alive (minimal check)
    """
    return jsonify({
        'alive': True,
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@health_bp.route('/version', methods=['GET'])
def version():
    """
    Get application version information
    """
    return jsonify({
        'version': os.environ.get('APP_VERSION', 'unknown'),
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'python_version': os.environ.get('PYTHON_VERSION', 'unknown'),
        'build_date': os.environ.get('BUILD_DATE', 'unknown'),
        'git_commit': os.environ.get('GIT_COMMIT', 'unknown')
    }), 200
