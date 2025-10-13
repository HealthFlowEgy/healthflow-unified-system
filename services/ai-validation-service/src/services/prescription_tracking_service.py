"""
Real-Time Prescription Tracking Service
Provides status updates, notifications, and lifecycle management
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
from collections import defaultdict
import asyncio

logger = logging.getLogger(__name__)


class PrescriptionStatus(Enum):
    """Prescription lifecycle statuses"""
    PENDING = "pending"  # Initial state
    PROCESSING = "processing"  # OCR/NLP in progress
    VALIDATED = "validated"  # Clinically validated
    TRANSMITTING = "transmitting"  # Being sent to pharmacy
    TRANSMITTED = "transmitted"  # Sent to pharmacy
    RECEIVED = "received"  # Pharmacy acknowledged
    IN_PROGRESS = "in_progress"  # Being filled
    READY = "ready"  # Ready for pickup
    PICKED_UP = "picked_up"  # Patient picked up
    DELIVERED = "delivered"  # Delivered (mail order)
    CANCELLED = "cancelled"  # Cancelled
    ERROR = "error"  # Error occurred


class NotificationChannel(Enum):
    """Notification delivery channels"""
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"


class EventType(Enum):
    """Prescription event types"""
    STATUS_CHANGE = "status_change"
    PHARMACY_UPDATE = "pharmacy_update"
    READY_FOR_PICKUP = "ready_for_pickup"
    REFILL_DUE = "refill_due"
    ERROR_OCCURRED = "error_occurred"
    CANCELLED = "cancelled"


@dataclass
class PrescriptionEvent:
    """Single prescription event"""
    event_id: str
    prescription_id: str
    event_type: EventType
    status: PrescriptionStatus
    timestamp: datetime
    message: str
    details: Dict
    source: str  # system, pharmacy, provider, patient


@dataclass
class PrescriptionTracking:
    """Complete prescription tracking information"""
    prescription_id: str
    patient_id: str
    provider_id: str
    pharmacy_id: Optional[str]
    current_status: PrescriptionStatus
    created_at: datetime
    updated_at: datetime
    events: List[PrescriptionEvent] = field(default_factory=list)
    estimated_ready_time: Optional[datetime] = None
    actual_ready_time: Optional[datetime] = None
    pickup_deadline: Optional[datetime] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class NotificationPreferences:
    """User notification preferences"""
    user_id: str
    channels: List[NotificationChannel]
    events: List[EventType]
    quiet_hours_start: Optional[str] = None  # HH:MM format
    quiet_hours_end: Optional[str] = None


class PrescriptionTrackingService:
    """
    Manages prescription lifecycle tracking and status updates
    """
    
    def __init__(self):
        self.trackings: Dict[str, PrescriptionTracking] = {}
        self.event_subscribers: Dict[str, List[callable]] = defaultdict(list)
    
    def create_tracking(
        self,
        prescription_id: str,
        patient_id: str,
        provider_id: str
    ) -> PrescriptionTracking:
        """
        Create new prescription tracking
        
        Args:
            prescription_id: Prescription ID
            patient_id: Patient ID
            provider_id: Provider ID
        
        Returns:
            PrescriptionTracking instance
        """
        tracking = PrescriptionTracking(
            prescription_id=prescription_id,
            patient_id=patient_id,
            provider_id=provider_id,
            pharmacy_id=None,
            current_status=PrescriptionStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.trackings[prescription_id] = tracking
        
        # Create initial event
        self._add_event(
            tracking=tracking,
            event_type=EventType.STATUS_CHANGE,
            message="Prescription created",
            source="system"
        )
        
        logger.info(f"Created tracking for prescription {prescription_id}")
        
        return tracking
    
    def update_status(
        self,
        prescription_id: str,
        new_status: PrescriptionStatus,
        message: str,
        source: str = "system",
        details: Optional[Dict] = None
    ) -> bool:
        """
        Update prescription status
        
        Args:
            prescription_id: Prescription ID
            new_status: New status
            message: Status change message
            source: Source of update
            details: Additional details
        
        Returns:
            Success boolean
        """
        tracking = self.trackings.get(prescription_id)
        
        if not tracking:
            logger.error(f"Tracking not found for prescription {prescription_id}")
            return False
        
        # Update status
        old_status = tracking.current_status
        tracking.current_status = new_status
        tracking.updated_at = datetime.utcnow()
        
        # Add event
        self._add_event(
            tracking=tracking,
            event_type=EventType.STATUS_CHANGE,
            message=message,
            source=source,
            details=details or {}
        )
        
        # Handle status-specific logic
        self._handle_status_transition(tracking, old_status, new_status)
        
        # Notify subscribers
        self._notify_event(prescription_id, EventType.STATUS_CHANGE, {
            "old_status": old_status.value,
            "new_status": new_status.value,
            "message": message
        })
        
        logger.info(
            f"Updated prescription {prescription_id} status: "
            f"{old_status.value} -> {new_status.value}"
        )
        
        return True
    
    def set_pharmacy(
        self,
        prescription_id: str,
        pharmacy_id: str,
        pharmacy_name: str
    ) -> bool:
        """
        Set pharmacy for prescription
        
        Args:
            prescription_id: Prescription ID
            pharmacy_id: Pharmacy NCPDP ID
            pharmacy_name: Pharmacy name
        
        Returns:
            Success boolean
        """
        tracking = self.trackings.get(prescription_id)
        
        if not tracking:
            return False
        
        tracking.pharmacy_id = pharmacy_id
        tracking.metadata["pharmacy_name"] = pharmacy_name
        tracking.updated_at = datetime.utcnow()
        
        self._add_event(
            tracking=tracking,
            event_type=EventType.PHARMACY_UPDATE,
            message=f"Routed to {pharmacy_name}",
            source="system",
            details={"pharmacy_id": pharmacy_id}
        )
        
        return True
    
    def set_estimated_ready_time(
        self,
        prescription_id: str,
        estimated_time: datetime
    ) -> bool:
        """
        Set estimated ready time
        
        Args:
            prescription_id: Prescription ID
            estimated_time: Estimated ready time
        
        Returns:
            Success boolean
        """
        tracking = self.trackings.get(prescription_id)
        
        if not tracking:
            return False
        
        tracking.estimated_ready_time = estimated_time
        tracking.updated_at = datetime.utcnow()
        
        # Set pickup deadline (typically 14 days)
        tracking.pickup_deadline = estimated_time + timedelta(days=14)
        
        self._add_event(
            tracking=tracking,
            event_type=EventType.PHARMACY_UPDATE,
            message=f"Estimated ready time: {estimated_time.strftime('%I:%M %p')}",
            source="pharmacy",
            details={"estimated_ready_time": estimated_time.isoformat()}
        )
        
        return True
    
    def mark_ready_for_pickup(
        self,
        prescription_id: str,
        actual_ready_time: Optional[datetime] = None
    ) -> bool:
        """
        Mark prescription as ready for pickup
        
        Args:
            prescription_id: Prescription ID
            actual_ready_time: Actual ready time (defaults to now)
        
        Returns:
            Success boolean
        """
        tracking = self.trackings.get(prescription_id)
        
        if not tracking:
            return False
        
        ready_time = actual_ready_time or datetime.utcnow()
        tracking.actual_ready_time = ready_time
        
        self.update_status(
            prescription_id=prescription_id,
            new_status=PrescriptionStatus.READY,
            message="Prescription ready for pickup",
            source="pharmacy"
        )
        
        # Trigger ready notification
        self._notify_event(prescription_id, EventType.READY_FOR_PICKUP, {
            "ready_time": ready_time.isoformat(),
            "pharmacy_id": tracking.pharmacy_id,
            "pharmacy_name": tracking.metadata.get("pharmacy_name")
        })
        
        return True
    
    def get_tracking(self, prescription_id: str) -> Optional[PrescriptionTracking]:
        """Get tracking information"""
        return self.trackings.get(prescription_id)
    
    def get_tracking_summary(self, prescription_id: str) -> Optional[Dict]:
        """
        Get summary of tracking information
        
        Args:
            prescription_id: Prescription ID
        
        Returns:
            Tracking summary dictionary
        """
        tracking = self.trackings.get(prescription_id)
        
        if not tracking:
            return None
        
        return {
            "prescription_id": tracking.prescription_id,
            "current_status": tracking.current_status.value,
            "pharmacy": {
                "id": tracking.pharmacy_id,
                "name": tracking.metadata.get("pharmacy_name")
            },
            "timeline": {
                "created": tracking.created_at.isoformat(),
                "updated": tracking.updated_at.isoformat(),
                "estimated_ready": tracking.estimated_ready_time.isoformat() if tracking.estimated_ready_time else None,
                "actual_ready": tracking.actual_ready_time.isoformat() if tracking.actual_ready_time else None,
                "pickup_deadline": tracking.pickup_deadline.isoformat() if tracking.pickup_deadline else None
            },
            "events_count": len(tracking.events),
            "recent_events": [
                {
                    "type": e.event_type.value,
                    "status": e.status.value,
                    "message": e.message,
                    "timestamp": e.timestamp.isoformat()
                }
                for e in tracking.events[-5:]  # Last 5 events
            ]
        }
    
    def get_patient_prescriptions(
        self,
        patient_id: str,
        active_only: bool = True
    ) -> List[Dict]:
        """
        Get all prescriptions for a patient
        
        Args:
            patient_id: Patient ID
            active_only: Only return active prescriptions
        
        Returns:
            List of prescription summaries
        """
        patient_prescriptions = []
        
        for tracking in self.trackings.values():
            if tracking.patient_id != patient_id:
                continue
            
            # Filter active prescriptions
            if active_only:
                inactive_statuses = [
                    PrescriptionStatus.PICKED_UP,
                    PrescriptionStatus.DELIVERED,
                    PrescriptionStatus.CANCELLED
                ]
                if tracking.current_status in inactive_statuses:
                    continue
            
            patient_prescriptions.append(self.get_tracking_summary(tracking.prescription_id))
        
        # Sort by updated time (most recent first)
        patient_prescriptions.sort(
            key=lambda x: x["timeline"]["updated"],
            reverse=True
        )
        
        return patient_prescriptions
    
    def subscribe_to_events(
        self,
        prescription_id: str,
        callback: callable
    ):
        """
        Subscribe to prescription events
        
        Args:
            prescription_id: Prescription ID
            callback: Callback function(event_type, data)
        """
        self.event_subscribers[prescription_id].append(callback)
    
    def _add_event(
        self,
        tracking: PrescriptionTracking,
        event_type: EventType,
        message: str,
        source: str,
        details: Optional[Dict] = None
    ):
        """Add event to tracking history"""
        import uuid
        
        event = PrescriptionEvent(
            event_id=str(uuid.uuid4()),
            prescription_id=tracking.prescription_id,
            event_type=event_type,
            status=tracking.current_status,
            timestamp=datetime.utcnow(),
            message=message,
            details=details or {},
            source=source
        )
        
        tracking.events.append(event)
    
    def _handle_status_transition(
        self,
        tracking: PrescriptionTracking,
        old_status: PrescriptionStatus,
        new_status: PrescriptionStatus
    ):
        """Handle status-specific logic"""
        # Set estimated ready time when transmitted
        if new_status == PrescriptionStatus.TRANSMITTED:
            if not tracking.estimated_ready_time:
                # Default: 30 minutes from transmission
                tracking.estimated_ready_time = datetime.utcnow() + timedelta(minutes=30)
        
        # Set pickup deadline when ready
        if new_status == PrescriptionStatus.READY:
            if not tracking.pickup_deadline:
                tracking.pickup_deadline = datetime.utcnow() + timedelta(days=14)
    
    def _notify_event(
        self,
        prescription_id: str,
        event_type: EventType,
        data: Dict
    ):
        """Notify subscribers of event"""
        subscribers = self.event_subscribers.get(prescription_id, [])
        
        for callback in subscribers:
            try:
                callback(event_type, data)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")


class NotificationService:
    """
    Manages multi-channel notifications for prescription updates
    """
    
    def __init__(self):
        self.preferences: Dict[str, NotificationPreferences] = {}
        self.notification_log = []
    
    def set_preferences(
        self,
        user_id: str,
        channels: List[NotificationChannel],
        events: List[EventType],
        quiet_hours_start: Optional[str] = None,
        quiet_hours_end: Optional[str] = None
    ):
        """
        Set user notification preferences
        
        Args:
            user_id: User ID
            channels: Enabled notification channels
            events: Events to notify about
            quiet_hours_start: Start of quiet hours (HH:MM)
            quiet_hours_end: End of quiet hours (HH:MM)
        """
        self.preferences[user_id] = NotificationPreferences(
            user_id=user_id,
            channels=channels,
            events=events,
            quiet_hours_start=quiet_hours_start,
            quiet_hours_end=quiet_hours_end
        )
        
        logger.info(f"Set notification preferences for user {user_id}")
    
    def notify(
        self,
        user_id: str,
        event_type: EventType,
        title: str,
        message: str,
        data: Optional[Dict] = None
    ):
        """
        Send notification to user
        
        Args:
            user_id: User ID
            event_type: Event type
            title: Notification title
            message: Notification message
            data: Additional data
        """
        prefs = self.preferences.get(user_id)
        
        if not prefs:
            logger.warning(f"No notification preferences for user {user_id}")
            return
        
        # Check if event type is enabled
        if event_type not in prefs.events:
            logger.debug(f"Event type {event_type} not enabled for user {user_id}")
            return
        
        # Check quiet hours
        if self._is_quiet_hours(prefs):
            logger.debug(f"Quiet hours active for user {user_id}, deferring notification")
            # In production, queue for later delivery
            return
        
        # Send via enabled channels
        for channel in prefs.channels:
            self._send_via_channel(
                channel=channel,
                user_id=user_id,
                title=title,
                message=message,
                data=data
            )
    
    def _is_quiet_hours(self, prefs: NotificationPreferences) -> bool:
        """Check if current time is in quiet hours"""
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        from datetime import time
        
        now = datetime.now().time()
        start = time.fromisoformat(prefs.quiet_hours_start)
        end = time.fromisoformat(prefs.quiet_hours_end)
        
        if start <= end:
            return start <= now <= end
        else:
            # Quiet hours span midnight
            return now >= start or now <= end
    
    def _send_via_channel(
        self,
        channel: NotificationChannel,
        user_id: str,
        title: str,
        message: str,
        data: Optional[Dict]
    ):
        """Send notification via specific channel"""
        notification_entry = {
            "user_id": user_id,
            "channel": channel.value,
            "title": title,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "sent"
        }
        
        try:
            if channel == NotificationChannel.SMS:
                self._send_sms(user_id, message)
            elif channel == NotificationChannel.EMAIL:
                self._send_email(user_id, title, message)
            elif channel == NotificationChannel.PUSH:
                self._send_push(user_id, title, message, data)
            elif channel == NotificationChannel.IN_APP:
                self._send_in_app(user_id, title, message, data)
            
            notification_entry["status"] = "sent"
            logger.info(f"Sent {channel.value} notification to user {user_id}")
        
        except Exception as e:
            notification_entry["status"] = "failed"
            notification_entry["error"] = str(e)
            logger.error(f"Failed to send {channel.value} notification: {e}")
        
        self.notification_log.append(notification_entry)
    
    def _send_sms(self, user_id: str, message: str):
        """Send SMS notification (mock implementation)"""
        # In production, integrate with Twilio, AWS SNS, etc.
        logger.info(f"SMS to {user_id}: {message}")
    
    def _send_email(self, user_id: str, title: str, message: str):
        """Send email notification (mock implementation)"""
        # In production, integrate with SendGrid, AWS SES, etc.
        logger.info(f"Email to {user_id}: {title} - {message}")
    
    def _send_push(self, user_id: str, title: str, message: str, data: Optional[Dict]):
        """Send push notification (mock implementation)"""
        # In production, integrate with FCM, APNs, etc.
        logger.info(f"Push to {user_id}: {title} - {message}")
    
    def _send_in_app(self, user_id: str, title: str, message: str, data: Optional[Dict]):
        """Send in-app notification (mock implementation)"""
        # In production, store in database for in-app display
        logger.info(f"In-app to {user_id}: {title} - {message}")
    
    def get_notification_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get user's notification history"""
        user_notifications = [
            n for n in self.notification_log
            if n["user_id"] == user_id
        ]
        
        # Sort by timestamp (most recent first)
        user_notifications.sort(
            key=lambda x: x["timestamp"],
            reverse=True
        )
        
        return user_notifications[:limit]


class RefillReminderService:
    """
    Manages refill reminders and adherence tracking
    """
    
    def __init__(
        self,
        tracking_service: PrescriptionTrackingService,
        notification_service: NotificationService
    ):
        self.tracking_service = tracking_service
        self.notification_service = notification_service
        self.reminder_schedule: Dict[str, datetime] = {}
    
    def schedule_refill_reminder(
        self,
        prescription_id: str,
        days_supply: int,
        remind_days_before: int = 7
    ):
        """
        Schedule refill reminder
        
        Args:
            prescription_id: Prescription ID
            days_supply: Days supply of medication
            remind_days_before: Days before running out to remind
        """
        tracking = self.tracking_service.get_tracking(prescription_id)
        
        if not tracking:
            logger.error(f"Tracking not found for prescription {prescription_id}")
            return
        
        # Calculate reminder date
        pickup_date = tracking.actual_ready_time or datetime.utcnow()
        reminder_date = pickup_date + timedelta(days=days_supply - remind_days_before)
        
        self.reminder_schedule[prescription_id] = reminder_date
        
        logger.info(
            f"Scheduled refill reminder for prescription {prescription_id} "
            f"on {reminder_date.strftime('%Y-%m-%d')}"
        )
    
    def check_reminders(self):
        """Check and send due reminders"""
        now = datetime.utcnow()
        
        for prescription_id, reminder_date in list(self.reminder_schedule.items()):
            if now >= reminder_date:
                tracking = self.tracking_service.get_tracking(prescription_id)
                
                if tracking:
                    # Send reminder
                    self.notification_service.notify(
                        user_id=tracking.patient_id,
                        event_type=EventType.REFILL_DUE,
                        title="Refill Reminder",
                        message="Your prescription is running low. Time to request a refill.",
                        data={
                            "prescription_id": prescription_id,
                            "pharmacy_id": tracking.pharmacy_id
                        }
                    )
                    
                    # Remove from schedule
                    del self.reminder_schedule[prescription_id]
                    
                    logger.info(f"Sent refill reminder for prescription {prescription_id}")


class PrescriptionDashboard:
    """
    Dashboard for tracking multiple prescriptions
    """
    
    def __init__(self, tracking_service: PrescriptionTrackingService):
        self.tracking_service = tracking_service
    
    def get_patient_dashboard(self, patient_id: str) -> Dict:
        """
        Get comprehensive dashboard for patient
        
        Args:
            patient_id: Patient ID
        
        Returns:
            Dashboard data
        """
        prescriptions = self.tracking_service.get_patient_prescriptions(patient_id)
        
        # Categorize prescriptions
        by_status = defaultdict(list)
        for rx in prescriptions:
            by_status[rx["current_status"]].append(rx)
        
        # Calculate statistics
        total = len(prescriptions)
        ready_count = len(by_status.get("ready", []))
        in_progress_count = len(by_status.get("in_progress", [])) + len(by_status.get("processing", []))
        
        # Find prescriptions needing attention
        needs_attention = []
        for rx in prescriptions:
            if rx["current_status"] == "error":
                needs_attention.append(rx)
            elif rx["current_status"] == "ready":
                # Check if approaching deadline
                if rx["timeline"]["pickup_deadline"]:
                    deadline = datetime.fromisoformat(rx["timeline"]["pickup_deadline"])
                    days_until_deadline = (deadline - datetime.utcnow()).days
                    if days_until_deadline <= 3:
                        needs_attention.append(rx)
        
        return {
            "patient_id": patient_id,
            "summary": {
                "total_active": total,
                "ready_for_pickup": ready_count,
                "in_progress": in_progress_count,
                "needs_attention": len(needs_attention)
            },
            "prescriptions": {
                "ready": by_status.get("ready", []),
                "in_progress": by_status.get("in_progress", []) + by_status.get("processing", []),
                "transmitted": by_status.get("transmitted", []),
                "needs_attention": needs_attention
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def get_provider_dashboard(self, provider_id: str) -> Dict:
        """
        Get dashboard for provider
        
        Args:
            provider_id: Provider ID
        
        Returns:
            Dashboard data
        """
        provider_prescriptions = []
        
        for tracking in self.tracking_service.trackings.values():
            if tracking.provider_id == provider_id:
                provider_prescriptions.append(
                    self.tracking_service.get_tracking_summary(tracking.prescription_id)
                )
        
        # Calculate statistics
        by_status = defaultdict(int)
        for rx in provider_prescriptions:
            by_status[rx["current_status"]] += 1
        
        # Calculate fill rate (prescriptions picked up / transmitted)
        transmitted = by_status.get("transmitted", 0) + by_status.get("ready", 0) + by_status.get("picked_up", 0)
        picked_up = by_status.get("picked_up", 0)
        fill_rate = (picked_up / transmitted * 100) if transmitted > 0 else 0
        
        return {
            "provider_id": provider_id,
            "summary": {
                "total_prescriptions": len(provider_prescriptions),
                "transmitted_today": by_status.get("transmitted", 0),
                "errors": by_status.get("error", 0),
                "fill_rate": round(fill_rate, 1)
            },
            "status_breakdown": dict(by_status),
            "recent_prescriptions": provider_prescriptions[:10],
            "generated_at": datetime.utcnow().isoformat()
        }


# Example usage
if __name__ == "__main__":
    # Initialize services
    tracking_service = PrescriptionTrackingService()
    notification_service = NotificationService()
    refill_service = RefillReminderService(tracking_service, notification_service)
    dashboard = PrescriptionDashboard(tracking_service)
    
    # Create prescription tracking
    tracking = tracking_service.create_tracking(
        prescription_id="RX-20251011-001",
        patient_id="PAT-123",
        provider_id="PROV-456"
    )
    
    print(f"Created tracking: {tracking.prescription_id}")
    
    # Update status through lifecycle
    tracking_service.update_status(
        prescription_id="RX-20251011-001",
        new_status=PrescriptionStatus.VALIDATED,
        message="Clinical validation passed"
    )
    
    tracking_service.set_pharmacy(
        prescription_id="RX-20251011-001",
        pharmacy_id="1234567",
        pharmacy_name="CVS Pharmacy #1234"
    )
    
    tracking_service.update_status(
        prescription_id="RX-20251011-001",
        new_status=PrescriptionStatus.TRANSMITTED,
        message="Sent to pharmacy"
    )
    
    tracking_service.update_status(
        prescription_id="RX-20251011-001",
        new_status=PrescriptionStatus.READY,
        message="Ready for pickup"
    )
    
    # Set notification preferences
    notification_service.set_preferences(
        user_id="PAT-123",
        channels=[NotificationChannel.SMS, NotificationChannel.EMAIL],
        events=[EventType.READY_FOR_PICKUP, EventType.REFILL_DUE],
        quiet_hours_start="22:00",
        quiet_hours_end="08:00"
    )
    
    # Send notification
    notification_service.notify(
        user_id="PAT-123",
        event_type=EventType.READY_FOR_PICKUP,
        title="Prescription Ready",
        message="Your prescription is ready for pickup at CVS Pharmacy #1234",
        data={"prescription_id": "RX-20251011-001"}
    )
    
    # Schedule refill reminder
    refill_service.schedule_refill_reminder(
        prescription_id="RX-20251011-001",
        days_supply=30,
        remind_days_before=7
    )
    
    # Get dashboard
    patient_dashboard = dashboard.get_patient_dashboard("PAT-123")
    
    print("\nPatient Dashboard:")
    print(f"Total Active: {patient_dashboard['summary']['total_active']}")
    print(f"Ready for Pickup: {patient_dashboard['summary']['ready_for_pickup']}")
    print(f"In Progress: {patient_dashboard['summary']['in_progress']}")
    
    # Get tracking summary
    summary = tracking_service.get_tracking_summary("RX-20251011-001")
    print(f"\nPrescription Status: {summary['current_status']}")
    print(f"Events: {summary['events_count']}")
    print("\nRecent Events:")
    for event in summary['recent_events']:
        print(f"  - {event['timestamp']}: {event['message']}")