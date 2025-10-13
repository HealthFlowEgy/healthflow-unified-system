/**
 * End-to-End Tests - Complete User Workflow
 * Tests the entire system workflow from user registration to prescription fulfillment
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('E2E: Complete Healthcare Workflow', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let doctorId: string;
  let patientId: string;
  let appointmentId: string;
  let prescriptionId: string;

  beforeAll(async () => {
    // Admin login
    const adminResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    adminToken = adminResponse.body.data.token;
  });

  describe('1. User Registration and Setup', () => {
    it('should register a new doctor', async () => {
      const response = await request(API_URL)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `doctor${Date.now()}@healthflow.eg`,
          firstName: 'John',
          lastName: 'Smith',
          specialization: 'Cardiology',
          licenseNumber: 'LIC123456',
          phone: '+201234567890',
          password: 'Doctor@123'
        });

      expect(response.status).toBe(201);
      doctorId = response.body.data.id;

      // Doctor login
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: response.body.data.email,
          password: 'Doctor@123'
        });

      doctorToken = loginResponse.body.data.token;
    });

    it('should register a new patient', async () => {
      const response = await request(API_URL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `patient${Date.now()}@healthflow.eg`,
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          gender: 'female',
          phone: '+201234567891',
          password: 'Patient@123'
        });

      expect(response.status).toBe(201);
      patientId = response.body.data.id;

      // Patient login
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: response.body.data.email,
          password: 'Patient@123'
        });

      patientToken = loginResponse.body.data.token;
    });

    it('should add patient medical history', async () => {
      const response = await request(API_URL)
        .post(`/api/patients/${patientId}/medical-history`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          condition: 'Hypertension',
          diagnosedDate: '2020-01-01',
          status: 'active',
          notes: 'Controlled with medication'
        });

      expect(response.status).toBe(201);
    });

    it('should add patient allergies', async () => {
      const response = await request(API_URL)
        .post(`/api/patients/${patientId}/allergies`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          allergen: 'Penicillin',
          severity: 'high',
          reaction: 'Anaphylaxis',
          diagnosedDate: '2015-06-15'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('2. Appointment Scheduling', () => {
    it('should create an appointment', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);

      const response = await request(API_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId,
          patientId,
          appointmentDate: appointmentDate.toISOString(),
          appointmentTime: '10:00',
          type: 'consultation',
          reason: 'Regular checkup'
        });

      expect(response.status).toBe(201);
      appointmentId = response.body.data.id;
    });

    it('should send appointment confirmation email', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/send-from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'email',
          templateId: 'appointment_confirmation',
          recipient: 'patient@healthflow.eg',
          data: {
            patientName: 'Jane Doe',
            appointmentDate: '2025-10-20',
            appointmentTime: '10:00 AM',
            doctorName: 'Dr. John Smith'
          }
        });

      expect(response.status).toBe(201);
    });

    it('should send appointment reminder SMS', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/send-from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'sms',
          templateId: 'appointment_reminder',
          recipient: '+201234567891',
          data: {
            patientName: 'Jane Doe',
            appointmentDate: '2025-10-20',
            appointmentTime: '10:00 AM'
          }
        });

      expect(response.status).toBe(201);
    });
  });

  describe('3. Consultation and Prescription', () => {
    it('should record vital signs', async () => {
      const response = await request(API_URL)
        .post(`/api/patients/${patientId}/vital-signs`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          heartRate: 72,
          temperature: 36.6,
          weight: 65.5,
          height: 165,
          recordedAt: new Date().toISOString()
        });

      expect(response.status).toBe(201);
    });

    it('should create a prescription', async () => {
      const response = await request(API_URL)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          doctorId,
          appointmentId,
          diagnosis: 'Hypertension - Follow-up',
          medications: [
            {
              name: 'Amlodipine',
              dosage: '5mg',
              frequency: 'Once daily',
              duration: '30 days',
              instructions: 'Take in the morning'
            }
          ],
          notes: 'Continue current medication. Follow-up in 3 months.'
        });

      expect(response.status).toBe(201);
      prescriptionId = response.body.data.id;
    });

    it('should check for drug allergies', async () => {
      const response = await request(API_URL)
        .get(`/api/patients/${patientId}/allergies`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should complete the appointment', async () => {
      const response = await request(API_URL)
        .post(`/api/appointments/${appointmentId}/complete`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          notes: 'Patient doing well. Continue current treatment.'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('4. Prescription Fulfillment', () => {
    it('should notify patient about prescription', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/send-from-template')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'email',
          templateId: 'prescription_ready',
          recipient: 'patient@healthflow.eg',
          data: {
            patientName: 'Jane Doe',
            prescriptionId,
            medications: 'Amlodipine 5mg'
          }
        });

      expect(response.status).toBe(201);
    });

    it('should view prescription details', async () => {
      const response = await request(API_URL)
        .get(`/api/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(prescriptionId);
      expect(response.body.data.medications.length).toBeGreaterThan(0);
    });

    it('should download prescription PDF', async () => {
      const response = await request(API_URL)
        .get(`/api/prescriptions/${prescriptionId}/download`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('pdf');
    });
  });

  describe('5. Analytics and Reporting', () => {
    it('should track doctor statistics', async () => {
      const response = await request(API_URL)
        .get(`/api/doctors/${doctorId}/statistics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalAppointments');
      expect(response.body.data).toHaveProperty('totalPrescriptions');
    });

    it('should generate system metrics', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/analytics/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalPrescriptions');
      expect(response.body.data).toHaveProperty('totalAppointments');
    });

    it('should log user activity', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });
  });

  describe('6. File Management', () => {
    it('should upload medical document', async () => {
      const testFile = Buffer.from('Medical test results');

      const response = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', testFile, 'test-results.pdf')
        .field('entityType', 'patient')
        .field('entityId', patientId);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should share document with doctor', async () => {
      // Get uploaded files
      const filesResponse = await request(API_URL)
        .get('/api/files')
        .set('Authorization', `Bearer ${patientToken}`);

      if (filesResponse.body.data.length > 0) {
        const fileId = filesResponse.body.data[0].id;

        const response = await request(API_URL)
          .post(`/api/files/${fileId}/share`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            userId: doctorId,
            permission: 'read'
          });

        expect(response.status).toBe(200);
      }
    });
  });
});
