"""
HealthFlow Auth Service
Extracted from ai-prescription-validation-system
Port: 4003

This service provides:
- JWT authentication
- MFA/TOTP support
- RBAC (Role-Based Access Control)
- HIPAA-compliant audit logging
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 900))  # 15 minutes
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 604800))  # 7 days
app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'postgresql://healthflow:password@postgres:5432/healthflow')
app.config['REDIS_URL'] = os.getenv('REDIS_URL', 'redis://redis:6379/0')

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": os.getenv('ALLOWED_ORIGINS', '*').split(','),
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"]
    }
})

# Try to import and register auth blueprint
try:
    from api.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    logger.info("✓ Auth blueprint registered")
except ImportError as e:
    logger.warning(f"Could not import auth blueprint: {e}")
    logger.warning("Auth endpoints will not be available")

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'auth-service',
        'version': '1.0.0',
        'port': int(os.getenv('PORT', 4003)),
        'features': {
            'jwt': True,
            'mfa': True,
            'rbac': True,
            'hipaa': True
        }
    }), 200

# Metrics endpoint
@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return jsonify({
        'service': 'auth-service',
        'status': 'operational',
        'uptime': 'N/A'  # TODO: Implement actual metrics
    }), 200

# Service info endpoint
@app.route('/api/auth/info', methods=['GET'])
def service_info():
    """Service information endpoint"""
    return jsonify({
        'service': 'HealthFlow Auth Service',
        'version': '1.0.0',
        'description': 'Authentication and authorization service',
        'endpoints': {
            'login': 'POST /api/auth/login',
            'refresh': 'POST /api/auth/refresh',
            'logout': 'POST /api/auth/logout',
            'verify': 'POST /api/auth/verify-token',
            'me': 'GET /api/auth/me'
        }
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4003))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    logger.info("=" * 50)
    logger.info("HealthFlow Auth Service")
    logger.info("=" * 50)
    logger.info(f"Port: {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Database: {app.config['DATABASE_URL'][:30]}...")
    logger.info(f"Redis: {app.config['REDIS_URL']}")
    logger.info("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

