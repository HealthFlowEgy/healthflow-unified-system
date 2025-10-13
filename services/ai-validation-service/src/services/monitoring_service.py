"""
Monitoring and observability service with Sentry integration
File: src/services/monitoring_service.py
"""

import os
import time
import psutil
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from functools import wraps
from flask import request, g
import logging

# Optional Sentry import
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


class MetricsCollector:
    """Collect and store application metrics"""
    
    def __init__(self):
        self.metrics = {
            'requests': [],
            'errors': [],
            'performance': {},
            'system': {}
        }
        self.start_time = datetime.utcnow()
    
    def record_request(self, endpoint: str, method: str, status_code: int, 
                       duration: float, user_id: Optional[int] = None):
        """Record API request metrics"""
        metric = {
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'duration': duration,
            'user_id': user_id,
            'timestamp': datetime.utcnow()
        }
        
        self.metrics['requests'].append(metric)
        
        # Keep only last 1000 requests in memory
        if len(self.metrics['requests']) > 1000:
            self.metrics['requests'] = self.metrics['requests'][-1000:]
    
    def record_error(self, error_type: str, error_message: str, 
                     endpoint: str, user_id: Optional[int] = None):
        """Record error occurrence"""
        error_metric = {
            'error_type': error_type,
            'error_message': error_message,
            'endpoint': endpoint,
            'user_id': user_id,
            'timestamp': datetime.utcnow()
        }
        
        self.metrics['errors'].append(error_metric)
        
        # Keep only last 500 errors in memory
        if len(self.metrics['errors']) > 500:
            self.metrics['errors'] = self.metrics['errors'][-500:]
    
    def get_system_metrics(self) -> Dict:
        """Get current system resource metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'memory_used_mb': memory.used / (1024 * 1024),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024 * 1024 * 1024),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logging.error(f"Error collecting system metrics: {str(e)}")
            return {}
    
    def get_uptime(self) -> float:
        """Get application uptime in seconds"""
        return (datetime.utcnow() - self.start_time).total_seconds()
    
    def get_request_stats(self, minutes: int = 60) -> Dict:
        """Get request statistics for the last N minutes"""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        recent_requests = [r for r in self.metrics['requests'] 
                          if r['timestamp'] > cutoff]
        
        if not recent_requests:
            return {
                'total_requests': 0,
                'avg_duration': 0,
                'error_rate': 0
            }
        
        total = len(recent_requests)
        errors = sum(1 for r in recent_requests if r['status_code'] >= 400)
        avg_duration = sum(r['duration'] for r in recent_requests) / total
        
        # Calculate requests per minute
        rpm = total / minutes if minutes > 0 else 0
        
        # Status code distribution
        status_dist = {}
        for req in recent_requests:
            code_range = f"{req['status_code'] // 100}xx"
            status_dist[code_range] = status_dist.get(code_range, 0) + 1
        
        return {
            'total_requests': total,
            'requests_per_minute': round(rpm, 2),
            'avg_duration_ms': round(avg_duration * 1000, 2),
            'error_count': errors,
            'error_rate': round(errors / total * 100, 2) if total > 0 else 0,
            'status_distribution': status_dist,
            'time_window_minutes': minutes
        }
    
    def get_error_stats(self, minutes: int = 60) -> Dict:
        """Get error statistics for the last N minutes"""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        recent_errors = [e for e in self.metrics['errors'] 
                        if e['timestamp'] > cutoff]
        
        if not recent_errors:
            return {'total_errors': 0}
        
        # Group errors by type
        error_types = {}
        for error in recent_errors:
            error_type = error['error_type']
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        return {
            'total_errors': len(recent_errors),
            'error_types': error_types,
            'time_window_minutes': minutes
        }
    
    def get_health_status(self) -> Dict:
        """Get overall health status"""
        system_metrics = self.get_system_metrics()
        request_stats = self.get_request_stats(minutes=5)
        
        # Determine health status
        status = 'healthy'
        issues = []
        
        # Check CPU
        if system_metrics.get('cpu_percent', 0) > 80:
            status = 'degraded'
            issues.append('High CPU usage')
        
        # Check memory
        if system_metrics.get('memory_percent', 0) > 85:
            status = 'degraded'
            issues.append('High memory usage')
        
        # Check disk
        if system_metrics.get('disk_percent', 0) > 90:
            status = 'degraded'
            issues.append('Low disk space')
        
        # Check error rate
        if request_stats.get('error_rate', 0) > 10:
            status = 'degraded'
            issues.append('High error rate')
        
        return {
            'status': status,
            'uptime_seconds': round(self.get_uptime(), 2),
            'issues': issues,
            'timestamp': datetime.utcnow().isoformat()
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


class MonitoringService:
    """Monitoring service with Sentry integration"""
    
    @staticmethod
    def initialize_sentry(app):
        """Initialize Sentry error tracking"""
        sentry_dsn = os.environ.get('SENTRY_DSN')
        
        if not sentry_dsn:
            app.logger.warning("SENTRY_DSN not configured. Sentry monitoring disabled.")
            return False
        
        if not SENTRY_AVAILABLE:
            app.logger.warning("Sentry SDK not installed. Install with: pip install sentry-sdk")
            return False
        
        try:
            environment = os.environ.get('FLASK_ENV', 'development')
            release = os.environ.get('APP_VERSION', 'unknown')
            
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[
                    FlaskIntegration(),
                    SqlalchemyIntegration(),
                ],
                environment=environment,
                release=f"prescription-validator@{release}",
                traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
                profiles_sample_rate=float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
                send_default_pii=False,  # Don't send PII for HIPAA compliance
                before_send=MonitoringService._before_send_sentry,
            )
            
            app.logger.info(f"Sentry initialized for environment: {environment}")
            return True
            
        except Exception as e:
            app.logger.error(f"Failed to initialize Sentry: {str(e)}")
            return False
    
    @staticmethod
    def _before_send_sentry(event, hint):
        """
        Filter and sanitize events before sending to Sentry
        Remove PII and sensitive data for HIPAA compliance
        """
        # Remove sensitive headers
        if 'request' in event:
            headers = event['request'].get('headers', {})
            sensitive_headers = ['Authorization', 'Cookie', 'X-Api-Key']
            for header in sensitive_headers:
                if header in headers:
                    headers[header] = '[Filtered]'
        
        # Remove sensitive data from extra context
        if 'extra' in event:
            sensitive_keys = ['password', 'token', 'api_key', 'secret']
            for key in list(event['extra'].keys()):
                if any(sensitive in key.lower() for sensitive in sensitive_keys):
                    event['extra'][key] = '[Filtered]'
        
        return event
    
    @staticmethod
    def capture_exception(exception: Exception, context: Dict = None):
        """Capture exception with optional context"""
        if SENTRY_AVAILABLE and os.environ.get('SENTRY_DSN'):
            with sentry_sdk.push_scope() as scope:
                if context:
                    for key, value in context.items():
                        scope.set_context(key, value)
                sentry_sdk.capture_exception(exception)
        
        # Always log locally
        logging.exception(f"Exception captured: {str(exception)}")
    
    @staticmethod
    def capture_message(message: str, level: str = 'info', context: Dict = None):
        """Capture message with optional context"""
        if SENTRY_AVAILABLE and os.environ.get('SENTRY_DSN'):
            with sentry_sdk.push_scope() as scope:
                if context:
                    for key, value in context.items():
                        scope.set_context(key, value)
                sentry_sdk.capture_message(message, level=level)
        
        # Always log locally
        log_method = getattr(logging, level, logging.info)
        log_method(message)


def monitor_request(f):
    """
    Decorator to monitor request performance and errors
    
    Usage:
        @app.route('/endpoint')
        @monitor_request
        def endpoint():
            return {'data': 'value'}
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        start_time = time.time()
        g.start_time = start_time
        
        try:
            response = f(*args, **kwargs)
            
            # Record successful request
            duration = time.time() - start_time
            status_code = getattr(response, 'status_code', 200) if hasattr(response, 'status_code') else 200
            
            user_id = getattr(g, 'user_id', None)
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=status_code,
                duration=duration,
                user_id=user_id
            )
            
            return response
            
        except Exception as e:
            # Record error
            duration = time.time() - start_time
            user_id = getattr(g, 'user_id', None)
            
            metrics_collector.record_error(
                error_type=type(e).__name__,
                error_message=str(e),
                endpoint=request.endpoint or 'unknown',
                user_id=user_id
            )
            
            metrics_collector.record_request(
                endpoint=request.endpoint or 'unknown',
                method=request.method,
                status_code=500,
                duration=duration,
                user_id=user_id
            )
            
            # Capture in Sentry
            MonitoringService.capture_exception(e, {
                'request': {
                    'endpoint': request.endpoint,
                    'method': request.method,
                    'user_id': user_id
                }
            })
            
            raise
    
    return decorated


def get_metrics_summary() -> Dict:
    """Get comprehensive metrics summary"""
    return {
        'health': metrics_collector.get_health_status(),
        'system': metrics_collector.get_system_metrics(),
        'requests_last_hour': metrics_collector.get_request_stats(minutes=60),
        'requests_last_5min': metrics_collector.get_request_stats(minutes=5),
        'errors_last_hour': metrics_collector.get_error_stats(minutes=60),
    }
