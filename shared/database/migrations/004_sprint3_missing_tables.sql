-- Migration: 004_sprint3_missing_tables.sql
-- Sprint 3 Missing Tables: doctor_licenses, prescription_templates, doctor_statistics
-- These tables were defined in Sprint 3 guide but not implemented

-- ============================================================================
-- DOCTOR LICENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    
    license_number VARCHAR(100) NOT NULL,
    license_type VARCHAR(100),
    issuing_authority VARCHAR(200) NOT NULL,
    
    issue_date DATE NOT NULL,
    expiry_date DATE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    document_url TEXT,
    notes TEXT,
    
    verified_by UUID,
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRESCRIPTION TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    template_data JSONB NOT NULL,
    
    usage_count VARCHAR(10) DEFAULT '0',
    last_used_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DOCTOR STATISTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL UNIQUE REFERENCES doctors(id) ON DELETE CASCADE,
    
    total_prescriptions VARCHAR(10) DEFAULT '0',
    total_patients VARCHAR(10) DEFAULT '0',
    average_prescriptions_per_day VARCHAR(10) DEFAULT '0',
    
    last_prescription_at TIMESTAMP,
    
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_doctor_licenses_doctor_id ON doctor_licenses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_licenses_license_number ON doctor_licenses(license_number);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor_id ON prescription_templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_templates_active ON prescription_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_doctor_statistics_doctor_id ON doctor_statistics(doctor_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE doctor_licenses IS 'Doctor license tracking - Sprint 3 Missing Table';
COMMENT ON TABLE prescription_templates IS 'Prescription templates - Sprint 3 Missing Table';
COMMENT ON TABLE doctor_statistics IS 'Doctor statistics for dashboard - Sprint 3 Missing Table';

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample license for Dr. Ahmed Hassan
INSERT INTO doctor_licenses (doctor_id, license_number, license_type, issuing_authority, issue_date, expiry_date, status)
SELECT 
    id,
    'EMS-2020-12345',
    'Medical License',
    'Egyptian Medical Syndicate',
    '2020-01-15',
    '2025-01-15',
    'active'
FROM doctors WHERE first_name = 'Ahmed' AND last_name = 'Hassan'
ON CONFLICT DO NOTHING;

-- Insert sample statistics for doctors
INSERT INTO doctor_statistics (doctor_id, total_prescriptions, total_patients, average_prescriptions_per_day)
SELECT 
    id,
    '0',
    '0',
    '0'
FROM doctors
ON CONFLICT (doctor_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Sprint 3 missing tables created successfully!';
    RAISE NOTICE 'Tables: doctor_licenses, prescription_templates, doctor_statistics';
END $$;
