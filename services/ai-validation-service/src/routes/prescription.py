import os
import uuid
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import tempfile
import logging

from src.models.prescription import (
    db, Prescription, Medication, ValidationResult, AuditLog,
    ValidationStatus, ProcessingStatus, InputFormat
)
from src.models.user import User
from src.services.ocr_service import OCRService
from src.services.nlp_service import NLPService
from src.services.validation_service import ValidationService

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
prescription_bp = Blueprint('prescription', __name__)

# Initialize services
ocr_service = OCRService()
nlp_service = NLPService()
validation_service = ValidationService()

# Configuration
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
UPLOAD_FOLDER = 'uploads'

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(file):
    """Get file size"""
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    return size

def create_audit_log(action: str, prescription_id: int = None, description: str = None, 
                    user_id: int = None, old_values: dict = None, new_values: dict = None):
    """Create audit log entry"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            prescription_id=prescription_id,
            action=action,
            resource_type='prescription',
            resource_id=str(prescription_id) if prescription_id else None,
            description=description,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        logger.error(f"Error creating audit log: {str(e)}")

@prescription_bp.route('/prescriptions/upload', methods=['POST'])
def upload_prescription():
    """Upload and process prescription file"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Check file size
        file_size = get_file_size(file)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large'}), 413
        
        # Get additional parameters
        input_format = request.form.get('input_format', 'handwritten_image')
        user_id = request.form.get('user_id', 1)  # Default user for now
        
        # Validate input format
        try:
            input_format_enum = InputFormat(input_format)
        except ValueError:
            return jsonify({'error': 'Invalid input format'}), 400
        
        # Create prescription record
        prescription_id = str(uuid.uuid4())
        prescription = Prescription(
            prescription_id=prescription_id,
            input_format=input_format_enum,
            processing_status=ProcessingStatus.UPLOADED,
            validation_status=ValidationStatus.PENDING,
            original_filename=secure_filename(file.filename),
            file_size=file_size
        )
        
        # Save file
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = f"{prescription_id}_{secure_filename(file.filename)}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        prescription.file_path = file_path
        
        # Save to database
        db.session.add(prescription)
        db.session.commit()
        
        # Create audit log
        create_audit_log(
            action='upload',
            prescription_id=prescription.id,
            description=f'Prescription uploaded: {file.filename}',
            user_id=user_id,
            new_values={'filename': file.filename, 'size': file_size}
        )
        
        logger.info(f"Prescription uploaded: {prescription_id}")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'prescription_id': prescription_id,
            'status': 'uploaded',
            'file_info': {
                'filename': file.filename,
                'size': file_size,
                'format': input_format
            }
        }), 201
        
    except RequestEntityTooLarge:
        return jsonify({'error': 'File too large'}), 413
    except Exception as e:
        logger.error(f"Error uploading prescription: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>/process', methods=['POST'])
def process_prescription(prescription_id):
    """Process uploaded prescription with OCR and NLP"""
    try:
        # Get prescription from database
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        if prescription.processing_status != ProcessingStatus.UPLOADED:
            return jsonify({'error': 'Prescription already processed or processing'}), 400
        
        # Update status to processing
        prescription.processing_status = ProcessingStatus.PROCESSING
        prescription.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Create audit log
        create_audit_log(
            action='process_start',
            prescription_id=prescription.id,
            description='Started prescription processing',
            user_id=request.form.get('user_id', 1)
        )
        
        # Process with OCR
        logger.info(f"Starting OCR processing for prescription {prescription_id}")
        ocr_results = ocr_service.process_file(prescription.file_path)
        
        if 'error' in ocr_results:
            prescription.processing_status = ProcessingStatus.FAILED
            db.session.commit()
            return jsonify({'error': f'OCR processing failed: {ocr_results["error"]}'}), 500
        
        # Extract text from OCR results
        if 'combined_text' in ocr_results:
            extracted_text = ocr_results['combined_text']
        elif 'text' in ocr_results:
            extracted_text = ocr_results['text']
        else:
            extracted_text = ""
        
        # Store OCR results
        prescription.ocr_text = extracted_text
        prescription.processing_metadata = json.dumps(ocr_results)
        
        # Process with NLP
        logger.info(f"Starting NLP processing for prescription {prescription_id}")
        nlp_results = nlp_service.process_prescription_text(extracted_text)
        
        # Store extracted entities
        prescription.extracted_entities = json.dumps(nlp_results.get('extracted_entities', {}))
        
        # Extract structured data
        parsed_data = nlp_results.get('parsed_data', {})
        
        # Update prescription with parsed information
        if parsed_data.get('patient_name'):
            prescription.patient_name = parsed_data['patient_name']
        if parsed_data.get('patient_address'):
            prescription.patient_address = parsed_data['patient_address']
        if parsed_data.get('prescriber_name'):
            prescription.prescriber_name = parsed_data['prescriber_name']
        if parsed_data.get('prescriber_license'):
            prescription.prescriber_license = parsed_data['prescriber_license']
        if parsed_data.get('prescription_date'):
            try:
                # Parse date string to datetime
                date_str = parsed_data['prescription_date']
                prescription.prescription_date = datetime.strptime(date_str, '%m/%d/%Y')
            except (ValueError, TypeError):
                logger.warning(f"Could not parse prescription date: {parsed_data.get('prescription_date')}")
        
        # Process medications
        medications_info = nlp_service.extract_medications_info(extracted_text)
        
        for med_info in medications_info:
            medication = Medication(
                prescription_id=prescription.id,
                drug_name=med_info.drug_name,
                generic_name=med_info.generic_name,
                dosage=med_info.dosage,
                formulation=med_info.formulation,
                frequency=med_info.frequency,
                route=med_info.route,
                duration=med_info.duration,
                instructions=med_info.instructions,
                confidence_score=med_info.confidence
            )
            db.session.add(medication)
        
        # Update processing status
        prescription.processing_status = ProcessingStatus.COMPLETED
        prescription.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Create audit log
        create_audit_log(
            action='process_complete',
            prescription_id=prescription.id,
            description='Prescription processing completed',
            user_id=request.form.get('user_id', 1),
            new_values={
                'medications_count': len(medications_info),
                'ocr_confidence': ocr_results.get('average_confidence', 0),
                'processing_time': nlp_results.get('processing_metadata', {}).get('processing_time', 0)
            }
        )
        
        logger.info(f"Prescription processing completed: {prescription_id}")
        
        return jsonify({
            'message': 'Prescription processed successfully',
            'prescription_id': prescription_id,
            'status': 'completed',
            'results': {
                'patient_name': prescription.patient_name,
                'prescriber_name': prescription.prescriber_name,
                'medications_count': len(medications_info),
                'ocr_confidence': ocr_results.get('average_confidence', 0),
                'processing_time': nlp_results.get('processing_metadata', {}).get('processing_time', 0)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing prescription {prescription_id}: {str(e)}")
        
        # Update status to failed
        try:
            prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
            if prescription:
                prescription.processing_status = ProcessingStatus.FAILED
                prescription.updated_at = datetime.utcnow()
                db.session.commit()
        except:
            pass
        
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>', methods=['GET'])
def get_prescription(prescription_id):
    """Get prescription details"""
    try:
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        return jsonify(prescription.to_dict()), 200
        
    except Exception as e:
        logger.error(f"Error getting prescription {prescription_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions', methods=['GET'])
def get_prescriptions():
    """Get list of prescriptions with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        
        query = Prescription.query
        
        # Filter by status if provided
        if status:
            try:
                status_enum = ProcessingStatus(status)
                query = query.filter(Prescription.processing_status == status_enum)
            except ValueError:
                return jsonify({'error': 'Invalid status'}), 400
        
        # Paginate results
        prescriptions = query.order_by(Prescription.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'prescriptions': [p.to_dict() for p in prescriptions.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': prescriptions.total,
                'pages': prescriptions.pages,
                'has_next': prescriptions.has_next,
                'has_prev': prescriptions.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting prescriptions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>/validate', methods=['POST'])
def validate_prescription(prescription_id):
    """Validate prescription using comprehensive validation service"""
    try:
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        if prescription.processing_status != ProcessingStatus.COMPLETED:
            return jsonify({'error': 'Prescription must be processed before validation'}), 400
        
        # Use comprehensive validation service
        validation_results = validation_service.validate_prescription(prescription.id)
        
        if 'error' in validation_results:
            return jsonify({'error': validation_results['error']}), 500
        
        # Create audit log
        create_audit_log(
            action='validate',
            prescription_id=prescription.id,
            description='Comprehensive prescription validation completed',
            user_id=request.form.get('user_id', 1),
            new_values={
                'validation_status': validation_results['validation_status'],
                'total_issues': validation_results['total_issues'],
                'high_severity_issues': validation_results['high_severity_issues'],
                'drug_interactions': validation_results['drug_interactions']
            }
        )
        
        return jsonify({
            'message': 'Prescription validated successfully',
            'prescription_id': prescription_id,
            'validation_status': validation_results['validation_status'],
            'summary': {
                'total_issues': validation_results['total_issues'],
                'high_severity_issues': validation_results['high_severity_issues'],
                'medium_severity_issues': validation_results['medium_severity_issues'],
                'low_severity_issues': validation_results['low_severity_issues'],
                'drug_interactions': validation_results['drug_interactions']
            },
            'validation_results': validation_results['validation_results'],
            'processing_time': validation_results['processing_time']
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating prescription {prescription_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>/validation-summary', methods=['GET'])
def get_validation_summary(prescription_id):
    """Get validation summary for a prescription"""
    try:
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        summary = validation_service.get_validation_summary(prescription.id)
        
        if 'error' in summary:
            return jsonify({'error': summary['error']}), 500
        
        return jsonify(summary), 200
        
    except Exception as e:
        logger.error(f"Error getting validation summary for prescription {prescription_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>/medications', methods=['GET'])
def get_prescription_medications(prescription_id):
    """Get medications for a prescription"""
    try:
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        medications = [med.to_dict() for med in prescription.medications]
        
        return jsonify({
            'prescription_id': prescription_id,
            'medications': medications,
            'count': len(medications)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting medications for prescription {prescription_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.route('/prescriptions/<prescription_id>/audit', methods=['GET'])
def get_prescription_audit_log(prescription_id):
    """Get audit log for a prescription"""
    try:
        prescription = Prescription.query.filter_by(prescription_id=prescription_id).first()
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        audit_logs = AuditLog.query.filter_by(prescription_id=prescription.id).order_by(
            AuditLog.timestamp.desc()
        ).all()
        
        return jsonify({
            'prescription_id': prescription_id,
            'audit_logs': [log.to_dict() for log in audit_logs],
            'count': len(audit_logs)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting audit log for prescription {prescription_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@prescription_bp.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@prescription_bp.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request'}), 400

@prescription_bp.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

