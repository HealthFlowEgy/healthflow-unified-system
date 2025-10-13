-- Sprint 2 Database Migrations
-- Creates tables for Prescription and Medicine services

-- ============================================
-- PRESCRIPTIONS TABLES
-- ============================================

-- Main prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Doctor Information
    doctor_id UUID NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_license VARCHAR(50) NOT NULL,
    doctor_specialty VARCHAR(100),
    
    -- Patient Information
    patient_id UUID NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_age INTEGER,
    patient_gender VARCHAR(10),
    patient_national_id VARCHAR(20),
    
    -- Prescription Details
    diagnosis TEXT,
    clinical_notes TEXT,
    prescription_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Possible statuses: draft, submitted, validated, approved, rejected, dispensed, cancelled
    
    -- AI Validation
    ai_validation_status VARCHAR(50),
    ai_validation_score DECIMAL(5, 2),
    ai_validation_result JSONB,
    
    -- Approval
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Dispensing
    dispensed_by UUID,
    dispensed_at TIMESTAMP,
    pharmacy_id UUID,
    
    -- Metadata
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Prescription items (medications)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    
    -- Medication Details
    medicine_id UUID NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    medicine_generic_name VARCHAR(255),
    medicine_strength VARCHAR(100),
    medicine_form VARCHAR(50),
    
    -- Dosage Instructions
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    refills INTEGER DEFAULT 0,
    
    -- Instructions
    instructions TEXT,
    warnings TEXT,
    
    -- Drug Interaction Check
    interaction_warnings JSONB,
    safety_alerts JSONB,
    
    -- Substitution
    substitution_allowed BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prescription history/audit
CREATE TABLE IF NOT EXISTS prescription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL,
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(50),
    
    changes JSONB,
    notes TEXT,
    
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant_id ON prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine_id ON prescription_items(medicine_id);
CREATE INDEX IF NOT EXISTS idx_prescription_history_prescription_id ON prescription_history(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_history_timestamp ON prescription_history(timestamp DESC);

-- ============================================
-- MEDICINES TABLES
-- ============================================

-- Main medicines table
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Medicine Details
    trade_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    
    -- Classification
    category VARCHAR(100),
    therapeutic_class VARCHAR(100),
    pharmacological_class VARCHAR(100),
    
    -- Form & Strength
    dosage_form VARCHAR(50),
    strength VARCHAR(100),
    
    -- Regulatory
    registration_number VARCHAR(100),
    eda_approved BOOLEAN DEFAULT FALSE,
    approval_date TIMESTAMP,
    
    -- Prescription Requirements
    is_prescription_required BOOLEAN DEFAULT TRUE,
    is_controlled_substance BOOLEAN DEFAULT FALSE,
    schedule VARCHAR(20),
    
    -- Clinical Information
    indications TEXT,
    contraindications TEXT,
    side_effects TEXT,
    interactions JSONB,
    warnings TEXT,
    
    -- Storage & Handling
    storage_conditions TEXT,
    shelf_life VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    discontinued_date TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Drug interactions table
CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    medicine_id_1 UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_id_2 UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    
    interaction_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    description TEXT NOT NULL,
    clinical_effects TEXT,
    management TEXT,
    
    evidence_level VARCHAR(20),
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(medicine_id_1, medicine_id_2)
);

-- Indexes for medicines
CREATE INDEX IF NOT EXISTS idx_medicines_trade_name ON medicines(trade_name);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_registration ON medicines(registration_number);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_medicine1 ON drug_interactions(medicine_id_1);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_medicine2 ON drug_interactions(medicine_id_2);

-- ============================================
-- SEED DATA - Sample Medicines
-- ============================================

INSERT INTO medicines (trade_name, generic_name, manufacturer, category, dosage_form, strength, is_prescription_required, eda_approved, indications)
VALUES
    ('Panadol', 'Paracetamol', 'GSK', 'Analgesic', 'tablet', '500mg', FALSE, TRUE, 'Pain relief and fever reduction'),
    ('Augmentin', 'Amoxicillin/Clavulanate', 'GSK', 'Antibiotic', 'tablet', '625mg', TRUE, TRUE, 'Bacterial infections'),
    ('Brufen', 'Ibuprofen', 'Abbott', 'NSAID', 'tablet', '400mg', FALSE, TRUE, 'Pain, inflammation, fever'),
    ('Zantac', 'Ranitidine', 'GSK', 'Antacid', 'tablet', '150mg', FALSE, TRUE, 'Acid reflux, ulcers'),
    ('Voltaren', 'Diclofenac', 'Novartis', 'NSAID', 'tablet', '50mg', TRUE, TRUE, 'Pain and inflammation')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE prescriptions IS 'Main prescriptions table - Sprint 2';
COMMENT ON TABLE prescription_items IS 'Prescription medications - Sprint 2';
COMMENT ON TABLE prescription_history IS 'Prescription audit trail - Sprint 2';
COMMENT ON TABLE medicines IS 'Medicine database - Sprint 2';
COMMENT ON TABLE drug_interactions IS 'Drug interaction database - Sprint 2';