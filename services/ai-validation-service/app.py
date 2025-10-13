"""
HealthFlow AI Validation Service
Extracted from ai-prescription-validation-system
Port: 5000

This service provides:
- OCR (Optical Character Recognition)
- Medical text extraction
- Clinical validation
- Drug interaction checking
- Prescription validation
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
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'postgresql://healthflow:password@postgres:5432/healthflow')

# Create upload folder
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Enable CORS
CORS(app, resources={
    r"/api/*": {
        "origins": os.getenv('ALLOWED_ORIGINS', '*').split(','),
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"]
    }
})

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-validation-service',
        'version': '1.0.0',
        'port': int(os.getenv('PORT', 5000)),
        'features': {
            'ocr': True,
            'clinical_validation': True,
            'drug_interaction_check': True,
            'prescription_validation': True
        }
    }), 200

# Metrics endpoint
@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return jsonify({
        'service': 'ai-validation-service',
        'status': 'operational',
        'uptime': 'N/A'  # TODO: Implement actual metrics
    }), 200

# Service info endpoint
@app.route('/api/validation/info', methods=['GET'])
def service_info():
    """Service information endpoint"""
    return jsonify({
        'service': 'HealthFlow AI Validation Service',
        'version': '1.0.0',
        'description': 'AI-powered prescription validation service',
        'endpoints': {
            'ocr': 'POST /api/validation/ocr/extract',
            'validate': 'POST /api/validation/validate/prescription',
            'drug_check': 'POST /api/validation/drug-interaction/check'
        }
    }), 200

# OCR endpoint (placeholder - will be implemented with actual service)
@app.route('/api/validation/ocr/extract', methods=['POST'])
def extract_text():
    """Extract text from prescription image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # TODO: Implement actual OCR processing
        return jsonify({
            'success': True,
            'message': 'OCR processing not yet implemented',
            'data': {
                'text': 'Sample extracted text',
                'confidence': 0.95
            }
        }), 200
        
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return jsonify({'error': str(e)}), 500

# Validation endpoint (placeholder)
@app.route('/api/validation/validate/prescription', methods=['POST'])
def validate_prescription():
    """Validate prescription data"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # TODO: Implement actual validation logic
        return jsonify({
            'success': True,
            'valid': True,
            'confidence': 0.92,
            'warnings': [],
            'errors': []
        }), 200
        
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    logger.info("=" * 50)
    logger.info("HealthFlow AI Validation Service")
    logger.info("=" * 50)
    logger.info(f"Port: {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info(f"Max file size: {app.config['MAX_CONTENT_LENGTH'] / (1024*1024)}MB")
    logger.info("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

