-- Migration: 005_sprint4_appointments.sql
-- Sprint 4: Appointment Service Tables

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Appointment Number
    appointment_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Participants
    patient_id UUID NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    doctor_id UUID NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    
    -- Appointment Details
    appointment_date TIMESTAMP NOT NULL,
    duration VARCHAR(20) NOT NULL DEFAULT '30',
    
    -- Type
    appointment_type VARCHAR(50) NOT NULL,
    visit_reason TEXT,
    
    -- Location
    location VARCHAR(200),
    room_number VARCHAR(50),
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_meeting_url TEXT,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by UUID,
    
    -- Completion
    completed_at TIMESTAMP,
    consultation_notes TEXT,
    diagnosis TEXT,
    prescription_created BOOLEAN DEFAULT FALSE,
    prescription_id UUID,
    
    -- Notifications
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    confirmation_sent_at TIMESTAMP,
    
    -- Metadata
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- APPOINTMENT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL,
    performed_by_name VARCHAR(255),
    
    previous_data JSONB,
    new_data JSONB,
    notes TEXT,
    
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_number ON appointments(appointment_number);

CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment_id ON appointment_history(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_timestamp ON appointment_history(timestamp);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE appointments IS 'Appointment scheduling and management - Sprint 4';
COMMENT ON TABLE appointment_history IS 'Appointment change history tracking - Sprint 4';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Sprint 4 appointment tables created successfully!';
    RAISE NOTICE 'Tables: appointments, appointment_history';
END $$;
