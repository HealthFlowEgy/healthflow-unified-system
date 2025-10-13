"""
Clinical Validation API Routes

RESTful API endpoints for pharmacist review workflow and clinical validation.

Author: HealthFlow API Team
Date: 2025-10-14
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from typing import Optional
try:
    from services.clinical_validation_service import (
        ClinicalValidationService,
        PharmacistReview,
        ReviewStatus,
        ReviewPriority,
        SafetySeverity
    )
    from models.prescription import Prescription
    from services.auth_service import require_auth, require_role
    from utils.validators import validate_request
except ImportError:
    # Fallback for different import paths
    from src.services.clinical_validation_service import (
        ClinicalValidationService,
        PharmacistReview,
        ReviewStatus,
        ReviewPriority,
        SafetySeverity
    )
    from src.models.prescription import Prescription
    from src.services.auth_service import require_auth, require_role
    from src.utils.validators import validate_request
from pydantic import BaseModel, Field, validator
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Create blueprint
clinical_bp = Blueprint('clinical', __name__, url_prefix='/api/clinical')

# Initialize service
clinical_service = ClinicalValidationService()


# ============================================================================
# Request/Response Models
# ============================================================================

class ReviewStatusEnum(str, Enum):
    """Enum for review status validation"""
    APPROVED = "APPROVED"
    APPROVED_WITH_CHANGES = "APPROVED_WITH_CHANGES"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"


class ReviewSubmissionRequest(BaseModel):
    """Request model for submitting a review"""
    status: ReviewStatusEnum
    corrected_data: Optional[dict] = None
    notes: Optional[str] = Field(None, max_length=2000)
    rejection_reason: Optional[str] = Field(None, max_length=1000)
    
    @validator('rejection_reason')
    def rejection_reason_required_if_rejected(cls, v, values):
        if values.get('status') == ReviewStatusEnum.REJECTED and not v:
            raise ValueError('rejection_reason is required when status is REJECTED')
        return v


class SafetyAlertRequest(BaseModel):
    """Request model for creating safety alert"""
    alert_type: str = Field(..., max_length=50)
    severity: str
    description: str = Field(..., max_length=2000)
    requires_fda_report: bool = False


class ReviewFilterRequest(BaseModel):
    """Request model for filtering reviews"""
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_me: bool = False
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = Field(50, ge=1, le=100)


# ============================================================================
# Review Queue Endpoints
# ============================================================================

@clinical_bp.route('/reviews/queue', methods=['GET'])
@require_auth
@require_role(['pharmacist', 'admin'])
def get_review_queue():
    """
    Get pending reviews for pharmacist queue
    
    Query Parameters:
        - priority: Filter by priority (CRITICAL, HIGH, MEDIUM, LOW, ROUTINE)
        - assigned_to_me: Show only reviews assigned to current user
        - limit: Maximum number of reviews to return (default: 50)
    
    Returns:
        200: List of pending reviews
        401: Unauthorized
        403: Forbidden (requires pharmacist role)
    """
    try:
        # Get query parameters
        priority_str = request.args.get('priority')
        assigned_to_me = request.args.get('assigned_to_me', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        
        # Parse priority
        priority = None
        if priority_str:
            try:
                priority = ReviewPriority(priority_str.upper())
            except ValueError:
                return jsonify({
                    'error': f'Invalid priority: {priority_str}',
                    'valid_priorities': [p.value for p in ReviewPriority]
                }), 400
        
        # Get current user
        pharmacist_id = g.current_user.id if assigned_to_me else None
        
        # Fetch reviews
        reviews = clinical_service.get_pending_reviews(
            pharmacist_id=pharmacist_id,
            priority=priority,
            limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'reviews': [review.to_dict() for review in reviews],
                'total': len(reviews)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching review queue: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch review queue'
        }), 500


@clinical_bp.route('/reviews/<review_id>', methods=['GET'])
@require_auth
@require_role(['pharmacist', 'doctor', 'admin'])
def get_review(review_id: str):
    """
    Get detailed review information
    
    Args:
        review_id: Review ID
    
    Returns:
        200: Review details
        404: Review not found
        401: Unauthorized
        403: Forbidden
    """
    try:
        review = PharmacistReview.query.filter_by(review_id=review_id).first()
        
        if not review:
            return jsonify({
                'status': 'error',
                'message': 'Review not found'
            }), 404
        
        # Get prescription details
        prescription = review.prescription
        
        return jsonify({
            'status': 'success',
            'data': {
                'review': review.to_dict(),
                'prescription': {
                    'id': prescription.id,
                    'prescription_id': prescription.prescription_id,
                    'patient_name': prescription.patient_name,
                    'created_at': prescription.created_at.isoformat(),
                    'image_url': prescription.image_url
                },
                'validation_flags': review.validation_flags,
                'original_data': review.original_data,
                'corrected_data': review.corrected_data
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching review {review_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch review'
        }), 500


@clinical_bp.route('/reviews/<review_id>/assign', methods=['POST'])
@require_auth
@require_role(['pharmacist', 'admin'])
def assign_review(review_id: str):
    """
    Assign review to current pharmacist
    
    Args:
        review_id: Review ID
    
    Returns:
        200: Review assigned successfully
        400: Review already assigned
        404: Review not found
        401: Unauthorized
        403: Forbidden
    """
    try:
        review = PharmacistReview.query.filter_by(review_id=review_id).first()
        
        if not review:
            return jsonify({
                'status': 'error',
                'message': 'Review not found'
            }), 404
        
        if review.assigned_to and review.assigned_to != g.current_user.id:
            return jsonify({
                'status': 'error',
                'message': 'Review already assigned to another pharmacist'
            }), 400
        
        # Assign review
        updated_review = clinical_service.assign_review(
            review=review,
            pharmacist_id=g.current_user.id
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Review assigned successfully',
            'data': updated_review.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error assigning review {review_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to assign review'
        }), 500


@clinical_bp.route('/reviews/<review_id>/submit', methods=['POST'])
@require_auth
@require_role(['pharmacist', 'admin'])
@validate_request(ReviewSubmissionRequest)
def submit_review(review_id: str):
    """
    Submit pharmacist review decision
    
    Args:
        review_id: Review ID
    
    Request Body:
        {
            "status": "APPROVED|APPROVED_WITH_CHANGES|REJECTED|ESCALATED",
            "corrected_data": {...},  // Optional, corrected prescription data
            "notes": "string",        // Optional, approval notes
            "rejection_reason": "string"  // Required if status is REJECTED
        }
    
    Returns:
        200: Review submitted successfully
        400: Invalid request
        404: Review not found
        401: Unauthorized
        403: Forbidden or not assigned to user
    """
    try:
        validated_data = request.validated_data
        
        review = PharmacistReview.query.filter_by(review_id=review_id).first()
        
        if not review:
            return jsonify({
                'status': 'error',
                'message': 'Review not found'
            }), 404
        
        # Verify review is assigned to current user
        if review.assigned_to != g.current_user.id:
            return jsonify({
                'status': 'error',
                'message': 'Review not assigned to you'
            }), 403
        
        # Submit review
        updated_review = clinical_service.submit_review(
            review=review,
            pharmacist_id=g.current_user.id,
            status=ReviewStatus(validated_data.status.value),
            corrected_data=validated_data.corrected_data,
            notes=validated_data.notes,
            rejection_reason=validated_data.rejection_reason
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Review submitted successfully',
            'data': updated_review.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error submitting review {review_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to submit review'
        }), 500


# ============================================================================
# Safety Alert Endpoints
# ============================================================================

@clinical_bp.route('/safety-alerts', methods=['POST'])
@require_auth
@require_role(['pharmacist', 'doctor', 'admin'])
@validate_request(SafetyAlertRequest)
def create_safety_alert():
    """
    Create a safety alert
    
    Request Body:
        {
            "prescription_id": 123,
            "alert_type": "DRUG_INTERACTION",
            "severity": "SEVERE",
            "description": "Potential interaction detected",
            "requires_fda_report": false
        }
    
    Returns:
        201: Safety alert created
        400: Invalid request
        401: Unauthorized
        403: Forbidden
    """
    try:
        validated_data = request.validated_data
        data = request.get_json()
        
        # Validate severity
        try:
            severity = SafetySeverity(validated_data.severity.upper())
        except ValueError:
            return jsonify({
                'error': f'Invalid severity: {validated_data.severity}',
                'valid_severities': [s.value for s in SafetySeverity]
            }), 400
        
        # Create alert
        alert = clinical_service.create_safety_alert(
            prescription_id=data.get('prescription_id'),
            alert_type=validated_data.alert_type,
            severity=severity,
            description=validated_data.description,
            detected_by=g.current_user.role.upper(),
            requires_fda_report=validated_data.requires_fda_report
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Safety alert created',
            'data': {
                'alert_id': alert.alert_id,
                'severity': alert.severity,
                'created_at': alert.detected_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating safety alert: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create safety alert'
        }), 500


@clinical_bp.route('/safety-alerts', methods=['GET'])
@require_auth
@require_role(['pharmacist', 'doctor', 'admin', 'auditor'])
def get_safety_alerts():
    """
    Get safety alerts
    
    Query Parameters:
        - status: Filter by status (OPEN, RESOLVED)
        - severity: Filter by severity
        - start_date: Filter from date (ISO 8601)
        - end_date: Filter to date (ISO 8601)
        - limit: Maximum alerts to return (default: 50)
    
    Returns:
        200: List of safety alerts
        401: Unauthorized
        403: Forbidden
    """
    try:
        from src.models.database import SafetyAlert
        
        # Get query parameters
        status = request.args.get('status')
        severity = request.args.get('severity')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        limit = int(request.args.get('limit', 50))
        
        # Build query
        query = SafetyAlert.query
        
        if status:
            query = query.filter_by(status=status.upper())
        if severity:
            query = query.filter_by(severity=severity.upper())
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
            query = query.filter(SafetyAlert.detected_at >= start_date)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
            query = query.filter(SafetyAlert.detected_at <= end_date)
        
        # Execute query
        alerts = query.order_by(
            SafetyAlert.detected_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'status': 'success',
            'data': {
                'alerts': [{
                    'alert_id': alert.alert_id,
                    'prescription_id': alert.prescription_id,
                    'alert_type': alert.alert_type,
                    'severity': alert.severity,
                    'description': alert.description,
                    'detected_by': alert.detected_by,
                    'detected_at': alert.detected_at.isoformat(),
                    'status': alert.status,
                    'requires_fda_report': alert.requires_fda_report
                } for alert in alerts],
                'total': len(alerts)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching safety alerts: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch safety alerts'
        }), 500


# ============================================================================
# Metrics & Reporting Endpoints
# ============================================================================

@clinical_bp.route('/metrics', methods=['GET'])
@require_auth
@require_role(['pharmacist', 'admin', 'auditor'])
def get_clinical_metrics():
    """
    Get clinical validation metrics
    
    Query Parameters:
        - start_date: Start date for metrics (ISO 8601)
        - end_date: End date for metrics (ISO 8601)
        - period: Predefined period (today, week, month, quarter)
    
    Returns:
        200: Clinical metrics
        401: Unauthorized
        403: Forbidden
    """
    try:
        # Parse date parameters
        start_date = None
        end_date = None
        
        period = request.args.get('period')
        if period:
            end_date = datetime.utcnow()
            if period == 'today':
                start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == 'week':
                start_date = end_date - timedelta(days=7)
            elif period == 'month':
                start_date = end_date - timedelta(days=30)
            elif period == 'quarter':
                start_date = end_date - timedelta(days=90)
        else:
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str)
            if end_date_str:
                end_date = datetime.fromisoformat(end_date_str)
        
        # Get metrics
        metrics = clinical_service.get_review_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'metrics': metrics,
                'period': {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching clinical metrics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch metrics'
        }), 500


@clinical_bp.route('/reviews/my-stats', methods=['GET'])
@require_auth
@require_role(['pharmacist'])
def get_my_review_stats():
    """
    Get review statistics for current pharmacist
    
    Returns:
        200: Pharmacist review statistics
        401: Unauthorized
        403: Forbidden
    """
    try:
        pharmacist_id = g.current_user.id
        
        # Get reviews for current pharmacist
        my_reviews = PharmacistReview.query.filter_by(
            reviewed_by=pharmacist_id
        ).all()
        
        completed_today = [
            r for r in my_reviews
            if r.completed_at and r.completed_at.date() == datetime.utcnow().date()
        ]
        
        completed_week = [
            r for r in my_reviews
            if r.completed_at and r.completed_at >= datetime.utcnow() - timedelta(days=7)
        ]
        
        stats = {
            'total_reviews': len(my_reviews),
            'completed_today': len(completed_today),
            'completed_this_week': len(completed_week),
            'pending_assigned_to_me': PharmacistReview.query.filter_by(
                assigned_to=pharmacist_id,
                status='PENDING'
            ).count(),
            'avg_review_time_minutes': sum(
                r.time_to_review_seconds for r in my_reviews 
                if r.time_to_review_seconds
            ) / len(my_reviews) / 60 if my_reviews else 0,
            'avg_accuracy_score': sum(
                r.accuracy_score for r in my_reviews 
                if r.accuracy_score
            ) / len([r for r in my_reviews if r.accuracy_score]) if my_reviews else 0,
            'approval_rate': len([
                r for r in my_reviews 
                if r.status == ReviewStatus.APPROVED.value
            ]) / len(my_reviews) if my_reviews else 0
        }
        
        return jsonify({
            'status': 'success',
            'data': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching pharmacist stats: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch statistics'
        }), 500


# ============================================================================
# Error Handlers
# ============================================================================

@clinical_bp.errorhandler(400)
def bad_request(error):
    """Handle bad request errors"""
    return jsonify({
        'status': 'error',
        'message': str(error)
    }), 400


@clinical_bp.errorhandler(404)
def not_found(error):
    """Handle not found errors"""
    return jsonify({
        'status': 'error',
        'message': 'Resource not found'
    }), 404


@clinical_bp.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    logger.error(f"Internal error: {str(error)}")
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500