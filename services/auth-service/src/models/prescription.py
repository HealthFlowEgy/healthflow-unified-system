from models.database import db
from datetime import datetime
from enum import Enum
import json

class ValidationStatus(Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    REQUIRES_REVIEW = "requires_review"

class ProcessingStatus(Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class InputFormat(Enum):
    HANDWRITTEN_IMAGE = "handwritten_image"
    VOICE_AUDIO = "voice_audio"
    DIGITAL_DATA = "digital_data"

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.String(100), unique=True, nullable=False)
    input_format = db.Column(db.Enum(InputFormat), nullable=False)
    processing_status = db.Column(db.Enum(ProcessingStatus), default=ProcessingStatus.UPLOADED)
    validation_status = db.Column(db.Enum(ValidationStatus), default=ValidationStatus.PENDING)
    
    # Patient Information
    patient_name = db.Column(db.String(200))
    patient_dob = db.Column(db.Date)
    patient_id = db.Column(db.String(100))
    patient_address = db.Column(db.Text)
    patient_allergies = db.Column(db.Text)  # JSON string
    patient_conditions = db.Column(db.Text)  # JSON string
    
    # Prescriber Information
    prescriber_name = db.Column(db.String(200))
    prescriber_license = db.Column(db.String(100))
    prescriber_specialty = db.Column(db.String(100))
    prescriber_contact = db.Column(db.Text)  # JSON string
    
    # Prescription Metadata
    prescription_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # File Information
    original_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    
    # Processing Results
    ocr_text = db.Column(db.Text)
    extracted_entities = db.Column(db.Text)  # JSON string
    processing_metadata = db.Column(db.Text)  # JSON string
    
    # Relationships
    medications = db.relationship('Medication', backref='prescription', lazy=True, cascade='all, delete-orphan')
    validation_results = db.relationship('ValidationResult', backref='prescription', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Prescription {self.prescription_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'prescription_id': self.prescription_id,
            'input_format': self.input_format.value if self.input_format else None,
            'processing_status': self.processing_status.value if self.processing_status else None,
            'validation_status': self.validation_status.value if self.validation_status else None,
            'patient_info': {
                'name': self.patient_name,
                'dob': self.patient_dob.isoformat() if self.patient_dob else None,
                'patient_id': self.patient_id,
                'address': json.loads(self.patient_address) if self.patient_address else None,
                'allergies': json.loads(self.patient_allergies) if self.patient_allergies else [],
                'conditions': json.loads(self.patient_conditions) if self.patient_conditions else []
            },
            'prescriber_info': {
                'name': self.prescriber_name,
                'license': self.prescriber_license,
                'specialty': self.prescriber_specialty,
                'contact': json.loads(self.prescriber_contact) if self.prescriber_contact else None
            },
            'prescription_date': self.prescription_date.isoformat() if self.prescription_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'file_info': {
                'original_filename': self.original_filename,
                'file_size': self.file_size
            },
            'medications': [med.to_dict() for med in self.medications],
            'validation_results': [result.to_dict() for result in self.validation_results]
        }

class Medication(db.Model):
    __tablename__ = 'medications'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=False)
    
    # Drug Information
    drug_name = db.Column(db.String(200), nullable=False)
    generic_name = db.Column(db.String(200))
    snomed_code = db.Column(db.String(50))
    ndc_code = db.Column(db.String(50))
    
    # Dosage Information
    dosage = db.Column(db.String(100))
    formulation = db.Column(db.String(100))  # tablet, capsule, liquid, etc.
    strength = db.Column(db.String(50))
    
    # Administration Information
    frequency = db.Column(db.String(100))  # once daily, BID, TID, etc.
    route = db.Column(db.String(50))  # oral, topical, IV, etc.
    duration = db.Column(db.String(100))  # 7 days, until finished, etc.
    quantity = db.Column(db.Integer)
    refills = db.Column(db.Integer)
    
    # Instructions
    instructions = db.Column(db.Text)
    special_instructions = db.Column(db.Text)
    
    # Metadata
    confidence_score = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Medication {self.drug_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'drug_name': self.drug_name,
            'generic_name': self.generic_name,
            'snomed_code': self.snomed_code,
            'ndc_code': self.ndc_code,
            'dosage': self.dosage,
            'formulation': self.formulation,
            'strength': self.strength,
            'frequency': self.frequency,
            'route': self.route,
            'duration': self.duration,
            'quantity': self.quantity,
            'refills': self.refills,
            'instructions': self.instructions,
            'special_instructions': self.special_instructions,
            'confidence_score': self.confidence_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ValidationResult(db.Model):
    __tablename__ = 'validation_results'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=False)
    
    # Validation Information
    validation_type = db.Column(db.String(100), nullable=False)  # drug_interaction, dosage, completeness, etc.
    status = db.Column(db.Enum(ValidationStatus), nullable=False)
    confidence = db.Column(db.Float)
    
    # Issue Details
    issue_type = db.Column(db.String(100))
    severity = db.Column(db.String(50))  # low, medium, high, critical
    description = db.Column(db.Text)
    affected_fields = db.Column(db.Text)  # JSON array
    recommendations = db.Column(db.Text)  # JSON array
    
    # Drug Interaction Specific
    drug1 = db.Column(db.String(200))
    drug2 = db.Column(db.String(200))
    interaction_type = db.Column(db.String(100))
    clinical_recommendation = db.Column(db.Text)
    
    # Metadata
    validation_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    validator_version = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<ValidationResult {self.validation_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'validation_type': self.validation_type,
            'status': self.status.value if self.status else None,
            'confidence': self.confidence,
            'issue_type': self.issue_type,
            'severity': self.severity,
            'description': self.description,
            'affected_fields': json.loads(self.affected_fields) if self.affected_fields else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'drug_interaction': {
                'drug1': self.drug1,
                'drug2': self.drug2,
                'interaction_type': self.interaction_type,
                'clinical_recommendation': self.clinical_recommendation
            } if self.drug1 and self.drug2 else None,
            'validation_timestamp': self.validation_timestamp.isoformat() if self.validation_timestamp else None,
            'validator_version': self.validator_version
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'))
    
    # Audit Information
    action = db.Column(db.String(100), nullable=False)  # upload, process, validate, approve, etc.
    resource_type = db.Column(db.String(50), nullable=False)  # prescription, medication, validation
    resource_id = db.Column(db.String(100))
    
    # Details
    description = db.Column(db.Text)
    old_values = db.Column(db.Text)  # JSON string
    new_values = db.Column(db.Text)  # JSON string
    
    # Metadata
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    
    def __repr__(self):
        return f'<AuditLog {self.action}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'prescription_id': self.prescription_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'description': self.description,
            'old_values': json.loads(self.old_values) if self.old_values else None,
            'new_values': json.loads(self.new_values) if self.new_values else None,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }

