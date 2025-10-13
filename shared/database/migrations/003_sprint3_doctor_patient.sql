-- Sprint 3: Doctor Portal & Patient Management
-- Migration: 003_sprint3_doctor_patient.sql
-- Tables: patients, patient_allergies, patient_medical_history, patient_vital_signs, doctors, doctor_schedules

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    
    -- Identification
    national_id VARCHAR(20) UNIQUE,
    passport_number VARCHAR(50),
    
    -- Demographics
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    blood_type VARCHAR(5) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    governorate VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'Egypt',
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    
    -- Medical Information
    height VARCHAR(20),
    weight VARCHAR(20),
    
    -- Insurance
    insurance_provider VARCHAR(200),
    insurance_number VARCHAR(100),
    insurance_expiry_date DATE,
    
    -- Photos
    photo_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_deceased BOOLEAN DEFAULT false,
    deceased_date DATE,
    
    -- Metadata
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for patients
CREATE INDEX idx_patients_national_id ON patients(national_id);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_email ON patients(email);

-- ============================================================================
-- PATIENT ALLERGIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    allergen VARCHAR(200) NOT NULL,
    allergy_type VARCHAR(50) NOT NULL CHECK (allergy_type IN ('medication', 'food', 'environmental', 'other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
    
    reaction TEXT,
    onset_date DATE,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for patient_allergies
CREATE INDEX idx_patient_allergies_patient_id ON patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_allergen ON patient_allergies(allergen);
CREATE INDEX idx_patient_allergies_severity ON patient_allergies(severity);

-- ============================================================================
-- PATIENT MEDICAL HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_medical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('chronic_disease', 'surgery', 'injury', 'other')),
    condition VARCHAR(200) NOT NULL,
    icd_code VARCHAR(20),
    
    diagnosis_date DATE,
    resolved_date DATE,
    
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'managed')),
    
    notes TEXT,
    treatment TEXT,
    
    diagnosed_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for patient_medical_history
CREATE INDEX idx_patient_medical_history_patient_id ON patient_medical_history(patient_id);
CREATE INDEX idx_patient_medical_history_condition ON patient_medical_history(condition);
CREATE INDEX idx_patient_medical_history_status ON patient_medical_history(status);

-- ============================================================================
-- PATIENT VITAL SIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID NOT NULL,
    
    -- Vital Signs
    blood_pressure_systolic VARCHAR(10),
    blood_pressure_diastolic VARCHAR(10),
    heart_rate VARCHAR(10),
    temperature VARCHAR(10),
    respiratory_rate VARCHAR(10),
    oxygen_saturation VARCHAR(10),
    
    height VARCHAR(20),
    weight VARCHAR(20),
    bmi VARCHAR(10),
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for patient_vital_signs
CREATE INDEX idx_patient_vital_signs_patient_id ON patient_vital_signs(patient_id);
CREATE INDEX idx_patient_vital_signs_recorded_at ON patient_vital_signs(recorded_at);

-- ============================================================================
-- DOCTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Professional Information
    license_number VARCHAR(50) NOT NULL UNIQUE,
    specialization VARCHAR(100) NOT NULL,
    sub_specialization VARCHAR(100),
    years_of_experience INTEGER,
    
    -- Qualifications
    medical_school VARCHAR(200),
    graduation_year INTEGER,
    certifications TEXT[],
    
    -- Contact & Location
    clinic_name VARCHAR(200),
    clinic_address TEXT,
    clinic_phone VARCHAR(20),
    consultation_fee DECIMAL(10,2),
    
    -- Bio & Languages
    bio TEXT,
    languages VARCHAR(100)[],
    
    -- Availability
    is_accepting_patients BOOLEAN DEFAULT true,
    max_patients_per_day INTEGER DEFAULT 20,
    
    -- Ratings
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    
    -- Metadata
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_license_number ON doctors(license_number);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_tenant_id ON doctors(tenant_id);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);

-- ============================================================================
-- DOCTOR SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    
    -- Schedule Information
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Slot Configuration
    slot_duration INTEGER NOT NULL DEFAULT 30, -- minutes
    break_start_time TIME,
    break_end_time TIME,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_break_time CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_end_time > break_start_time)
    )
);

-- Indexes for doctor_schedules
CREATE INDEX idx_doctor_schedules_doctor_id ON doctor_schedules(doctor_id);
CREATE INDEX idx_doctor_schedules_day_of_week ON doctor_schedules(day_of_week);
CREATE INDEX idx_doctor_schedules_is_active ON doctor_schedules(is_active);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample patients
INSERT INTO patients (
    first_name, last_name, national_id, date_of_birth, gender, blood_type,
    email, phone, address, city, governorate, tenant_id, created_by
) VALUES
('Ahmed', 'Hassan', '29001011234567', '1990-01-01', 'male', 'A+', 
 'ahmed.hassan@example.com', '+201001234567', '123 Main St', 'Cairo', 'Cairo',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Fatima', 'Ali', '29002022345678', '1985-05-15', 'female', 'O+',
 'fatima.ali@example.com', '+201002345678', '456 Nile St', 'Alexandria', 'Alexandria',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('Mohamed', 'Ibrahim', '29003033456789', '1978-12-20', 'male', 'B+',
 'mohamed.ibrahim@example.com', '+201003456789', '789 Pyramid Ave', 'Giza', 'Giza',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- Insert sample doctors
INSERT INTO doctors (
    user_id, license_number, specialization, years_of_experience,
    medical_school, graduation_year, clinic_name, consultation_fee,
    is_accepting_patients, tenant_id
) VALUES
('00000000-0000-0000-0000-000000000002', 'EG-DOC-12345', 'Cardiology', 15,
 'Cairo University Faculty of Medicine', 2008, 'Heart Care Clinic', 500.00,
 true, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'EG-DOC-23456', 'Pediatrics', 10,
 'Ain Shams University Faculty of Medicine', 2013, 'Kids Health Center', 350.00,
 true, '00000000-0000-0000-0000-000000000001');

COMMENT ON TABLE patients IS 'Patient demographics and medical records';
COMMENT ON TABLE patient_allergies IS 'Patient allergy information';
COMMENT ON TABLE patient_medical_history IS 'Patient medical history and conditions';
COMMENT ON TABLE patient_vital_signs IS 'Patient vital signs measurements';
COMMENT ON TABLE doctors IS 'Doctor profiles and professional information';
COMMENT ON TABLE doctor_schedules IS 'Doctor availability schedules';

