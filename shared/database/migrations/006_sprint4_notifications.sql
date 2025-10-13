-- Migration: 006_sprint4_notifications.sql
-- Sprint 4: Notification Service Tables

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(50) NOT NULL, -- patient, doctor, pharmacy, admin
    recipient_name VARCHAR(255),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    
    -- Notification Details
    notification_type VARCHAR(100) NOT NULL, -- appointment_reminder, prescription_ready, appointment_confirmed, etc.
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    
    -- Channels
    channel VARCHAR(50) NOT NULL, -- email, sms, push, in_app
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, read
    
    -- Delivery
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    
    -- Metadata
    related_entity_type VARCHAR(100), -- appointment, prescription, etc.
    related_entity_id UUID,
    metadata JSONB,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Timestamps
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Details
    template_name VARCHAR(200) NOT NULL UNIQUE,
    template_type VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Content
    subject_template VARCHAR(500) NOT NULL,
    message_template TEXT NOT NULL,
    
    -- Channels
    supported_channels TEXT[] NOT NULL, -- array of channels
    
    -- Variables
    template_variables JSONB, -- list of available variables
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type ON notifications(recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type);

-- ============================================================================
-- SEED DATA
-- ============================================================================
INSERT INTO notification_templates (template_name, template_type, subject_template, message_template, supported_channels, template_variables)
VALUES
('appointment_reminder', 'appointment', 
 'Appointment Reminder - {{appointmentDate}}',
 'Dear {{patientName}}, this is a reminder for your appointment with Dr. {{doctorName}} on {{appointmentDate}} at {{appointmentTime}}. Location: {{location}}',
 ARRAY['email', 'sms'],
 '{"patientName": "string", "doctorName": "string", "appointmentDate": "date", "appointmentTime": "time", "location": "string"}'::jsonb),

('appointment_confirmed', 'appointment',
 'Appointment Confirmed',
 'Dear {{patientName}}, your appointment with Dr. {{doctorName}} has been confirmed for {{appointmentDate}} at {{appointmentTime}}.',
 ARRAY['email', 'sms', 'in_app'],
 '{"patientName": "string", "doctorName": "string", "appointmentDate": "date", "appointmentTime": "time"}'::jsonb),

('prescription_ready', 'prescription',
 'Prescription Ready for Pickup',
 'Dear {{patientName}}, your prescription {{prescriptionNumber}} is ready for pickup at {{pharmacyName}}.',
 ARRAY['email', 'sms'],
 '{"patientName": "string", "prescriptionNumber": "string", "pharmacyName": "string"}'::jsonb)

ON CONFLICT (template_name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE notifications IS 'Notification tracking and delivery - Sprint 4';
COMMENT ON TABLE notification_templates IS 'Notification templates - Sprint 4';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Sprint 4 notification tables created successfully!';
    RAISE NOTICE 'Tables: notifications, notification_templates';
END $$;
