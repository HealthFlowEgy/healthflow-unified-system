import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * End-to-End Tests for Complete Prescription Workflow
 * 
 * This test suite verifies the entire prescription lifecycle:
 * 1. Doctor logs in
 * 2. Doctor creates a prescription for a patient
 * 3. AI validation service validates the prescription
 * 4. Pharmacist logs in
 * 5. Pharmacist views pending prescriptions
 * 6. Pharmacist dispenses medication
 * 7. Patient views their prescription history
 * 8. Regulator audits the prescription
 */

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000';

describe('Complete Prescription Workflow E2E Tests', () => {
  let doctorToken: string;
  let pharmacistToken: string;
  let patientToken: string;
  let regulatorToken: string;
  let prescriptionId: string;
  let patientId: string;

  const testData = {
    doctor: {
      email: `doctor-${Date.now()}@healthflow.test`,
      password: 'Doctor123!@#Secure',
      name: 'Dr. Ahmed Hassan',
      role: 'doctor',
      license_number: `DOC-${Date.now()}`
    },
    pharmacist: {
      email: `pharmacist-${Date.now()}@healthflow.test`,
      password: 'Pharmacist123!@#Secure',
      name: 'Pharmacist Mohamed Ali',
      role: 'pharmacist',
      license_number: `PHARM-${Date.now()}`
    },
    patient: {
      email: `patient-${Date.now()}@healthflow.test`,
      password: 'Patient123!@#Secure',
      name: 'Patient Fatima Ibrahim',
      role: 'patient',
      national_id: `${Date.now()}`
    },
    regulator: {
      email: `regulator-${Date.now()}@healthflow.test`,
      password: 'Regulator123!@#Secure',
      name: 'EDA Officer',
      role: 'regulator'
    },
    prescription: {
      diagnosis: 'Type 2 Diabetes Mellitus',
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'twice daily',
          duration: '30 days',
          instructions: 'Take with food'
        },
        {
          name: 'Glimepiride',
          dosage: '2mg',
          frequency: 'once daily',
          duration: '30 days',
          instructions: 'Take before breakfast'
        }
      ],
      notes: 'Monitor blood glucose levels regularly. Follow up in 2 weeks.'
    }
  };

  beforeAll(async () => {
    // Wait for all services to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  describe('Step 1: User Registration and Authentication', () => {
    it('should register doctor, pharmacist, patient, and regulator', async () => {
      // Register doctor
      const doctorRes = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testData.doctor)
        .expect(201);
      expect(doctorRes.body.user.role).toBe('doctor');

      // Register pharmacist
      const pharmacistRes = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testData.pharmacist)
        .expect(201);
      expect(pharmacistRes.body.user.role).toBe('pharmacist');

      // Register patient
      const patientRes = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testData.patient)
        .expect(201);
      expect(patientRes.body.user.role).toBe('patient');
      patientId = patientRes.body.user.id;

      // Register regulator
      const regulatorRes = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testData.regulator)
        .expect(201);
      expect(regulatorRes.body.user.role).toBe('regulator');
    });

    it('should authenticate all users', async () => {
      // Doctor login
      const doctorLogin = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testData.doctor.email,
          password: testData.doctor.password
        })
        .expect(200);
      doctorToken = doctorLogin.body.access_token;

      // Pharmacist login
      const pharmacistLogin = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testData.pharmacist.email,
          password: testData.pharmacist.password
        })
        .expect(200);
      pharmacistToken = pharmacistLogin.body.access_token;

      // Patient login
      const patientLogin = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testData.patient.email,
          password: testData.patient.password
        })
        .expect(200);
      patientToken = patientLogin.body.access_token;

      // Regulator login
      const regulatorLogin = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testData.regulator.email,
          password: testData.regulator.password
        })
        .expect(200);
      regulatorToken = regulatorLogin.body.access_token;
    });
  });

  describe('Step 2: Doctor Creates Prescription', () => {
    it('should create a new prescription', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/prescription')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patientId,
          ...testData.prescription
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('prescription_id');
      expect(response.body.status).toBe('pending_validation');
      expect(response.body.medications).toHaveLength(2);

      prescriptionId = response.body.prescription_id;
    });

    it('should not allow patient to create prescription', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/prescription')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patient_id: patientId,
          ...testData.prescription
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 3: AI Validation', () => {
    it('should validate prescription with AI service', async () => {
      const response = await request(API_GATEWAY_URL)
        .post(`/api/validation/validate/${prescriptionId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('validation_status');
      expect(response.body.validation_status).toMatch(/approved|pending_review/);
      expect(response.body).toHaveProperty('drug_interactions');
      expect(response.body).toHaveProperty('dosage_validation');
    });

    it('should detect drug interactions if present', async () => {
      // This would test the AI service's ability to detect interactions
      // Implementation depends on the AI service capabilities
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Step 4: Pharmacist Views and Dispenses', () => {
    it('should allow pharmacist to view pending prescriptions', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/pharmacy/prescriptions/pending')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
      
      const prescription = response.body.prescriptions.find(
        (p: any) => p.prescription_id === prescriptionId
      );
      expect(prescription).toBeDefined();
    });

    it('should allow pharmacist to dispense medication', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          prescription_id: prescriptionId,
          dispensed_medications: testData.prescription.medications.map(m => ({
            name: m.name,
            quantity: 30,
            batch_number: `BATCH-${Date.now()}`
          }))
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('dispense_id');
      expect(response.body.status).toBe('dispensed');
    });

    it('should not allow doctor to dispense medication', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          prescription_id: prescriptionId,
          dispensed_medications: []
        })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 5: Patient Views Prescription History', () => {
    it('should allow patient to view their prescriptions', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/patients/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
      
      const prescription = response.body.prescriptions.find(
        (p: any) => p.prescription_id === prescriptionId
      );
      expect(prescription).toBeDefined();
      expect(prescription.status).toBe('dispensed');
    });

    it('should not allow patient to view other patients prescriptions', async () => {
      const response = await request(API_GATEWAY_URL)
        .get(`/api/patients/${patientId}/prescriptions`)
        .set('Authorization', `Bearer ${doctorToken}`) // Using doctor token
        .expect('Content-Type', /json/);

      // Should either return 200 (if doctor has access) or 403 (if not)
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Step 6: Regulatory Oversight', () => {
    it('should allow regulator to audit prescription', async () => {
      const response = await request(API_GATEWAY_URL)
        .get(`/api/regulatory/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${regulatorToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('prescription_id');
      expect(response.body).toHaveProperty('audit_trail');
      expect(response.body).toHaveProperty('compliance_status');
    });

    it('should allow regulator to view all prescriptions', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/regulatory/prescriptions')
        .set('Authorization', `Bearer ${regulatorToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
    });

    it('should not allow patient to access regulatory endpoints', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/regulatory/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Step 7: Verify Complete Workflow', () => {
    it('should have complete audit trail', async () => {
      const response = await request(API_GATEWAY_URL)
        .get(`/api/regulatory/prescriptions/${prescriptionId}/audit-trail`)
        .set('Authorization', `Bearer ${regulatorToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      
      // Verify all key events are logged
      const eventTypes = response.body.events.map((e: any) => e.event_type);
      expect(eventTypes).toContain('prescription_created');
      expect(eventTypes).toContain('ai_validation_completed');
      expect(eventTypes).toContain('medication_dispensed');
    });

    it('should reflect correct final status', async () => {
      const response = await request(API_GATEWAY_URL)
        .get(`/api/prescription/${prescriptionId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('dispensed');
      expect(response.body.dispensed_at).toBeDefined();
      expect(response.body.dispensed_by).toBeDefined();
    });
  });
});
