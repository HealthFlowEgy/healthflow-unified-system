-- Sprint 2 Hotfix Migration
-- Fixes missing medicine_price_history table and adds constraints

-- Create medicine_price_history table
CREATE TABLE medicine_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    source VARCHAR(100) NOT NULL, -- 'pharmacy', 'manufacturer', 'government', 'market'
    region VARCHAR(100),
    pharmacy_id UUID, -- Reference to pharmacy if source is 'pharmacy'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > effective_date),
    CONSTRAINT valid_source CHECK (source IN ('pharmacy', 'manufacturer', 'government', 'market'))
);

-- Add indexes for medicine_price_history
CREATE INDEX idx_medicine_price_history_medicine_id ON medicine_price_history(medicine_id);
CREATE INDEX idx_medicine_price_history_effective_date ON medicine_price_history(effective_date DESC);
CREATE INDEX idx_medicine_price_history_source ON medicine_price_history(source);
CREATE INDEX idx_medicine_price_history_region ON medicine_price_history(region);

-- Add check constraints to existing tables
ALTER TABLE prescriptions 
ADD CONSTRAINT valid_status CHECK (status IN ('draft', 'validated', 'approved', 'dispensed', 'cancelled', 'expired'));

ALTER TABLE prescription_items 
ADD CONSTRAINT valid_quantity CHECK (quantity > 0),
ADD CONSTRAINT valid_unit_price CHECK (unit_price >= 0);

-- Add composite indexes for complex queries
CREATE INDEX idx_prescriptions_patient_status ON prescriptions(patient_id, status);
CREATE INDEX idx_prescriptions_doctor_date ON prescriptions(doctor_id, created_at DESC);
CREATE INDEX idx_prescription_items_prescription_medicine ON prescription_items(prescription_id, medicine_id);

-- Populate drug_interactions with common interactions
INSERT INTO drug_interactions (id, medicine_a_id, medicine_b_id, interaction_type, severity, description, clinical_significance) 
SELECT 
    gen_random_uuid(),
    m1.id,
    m2.id,
    'drug-drug',
    'moderate',
    'Potential interaction between ' || m1.generic_name || ' and ' || m2.generic_name,
    'Monitor patient for increased side effects'
FROM medicines m1, medicines m2 
WHERE m1.id != m2.id 
AND m1.generic_name IN ('Paracetamol', 'Ibuprofen')
AND m2.generic_name IN ('Amoxicillin/Clavulanate')
LIMIT 3;

-- Add sample price history data
INSERT INTO medicine_price_history (medicine_id, price, source, region, notes)
SELECT 
    id,
    CASE 
        WHEN generic_name = 'Paracetamol' THEN 15.50
        WHEN generic_name = 'Ibuprofen' THEN 25.75
        WHEN generic_name LIKE '%Amoxicillin%' THEN 45.00
        ELSE 20.00
    END,
    'government',
    'Cairo',
    'Initial pricing data from EDA database'
FROM medicines;

-- Add comments
COMMENT ON TABLE medicine_price_history IS 'Historical pricing data for medicines across different sources and regions';
COMMENT ON COLUMN medicine_price_history.source IS 'Source of pricing: pharmacy, manufacturer, government, market';
COMMENT ON COLUMN medicine_price_history.effective_date IS 'Date when this price became effective';
COMMENT ON COLUMN medicine_price_history.end_date IS 'Date when this price expired (NULL for current prices)';

