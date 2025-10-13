/**
 * Appointment Service Integration Tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Appointment Service', () => {
  let authToken: string;
  let appointmentId: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'patient@healthflow.eg',
        password: 'Patient@123'
      });

    authToken = response.body.data.token;
  });

  describe('Appointment CRUD', () => {
    it('should create an appointment', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);

      const response = await request(API_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId: 'test-doctor-id',
          patientId: 'test-patient-id',
          appointmentDate: appointmentDate.toISOString(),
          appointmentTime: '10:00',
          type: 'consultation',
          notes: 'Regular checkup'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      appointmentId = response.body.data.id;
    });

    it('should list appointments', async () => {
      const response = await request(API_URL)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get appointment by ID', async () => {
      const response = await request(API_URL)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(appointmentId);
    });

    it('should update appointment', async () => {
      const response = await request(API_URL)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Updated notes'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.notes).toBe('Updated notes');
    });
  });

  describe('Appointment Status', () => {
    it('should cancel appointment', async () => {
      const response = await request(API_URL)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Patient request'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should complete appointment', async () => {
      // Create new appointment first
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);

      const createResponse = await request(API_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId: 'test-doctor-id',
          patientId: 'test-patient-id',
          appointmentDate: appointmentDate.toISOString(),
          appointmentTime: '14:00',
          type: 'consultation'
        });

      const newAppointmentId = createResponse.body.data.id;

      const response = await request(API_URL)
        .post(`/api/appointments/${newAppointmentId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Appointment completed successfully'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('Appointment Filtering', () => {
    it('should get upcoming appointments', async () => {
      const response = await request(API_URL)
        .get('/api/appointments/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by doctor', async () => {
      const response = await request(API_URL)
        .get('/api/appointments')
        .query({ doctorId: 'test-doctor-id' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((apt: any) => {
        expect(apt.doctorId).toBe('test-doctor-id');
      });
    });

    it('should filter by patient', async () => {
      const response = await request(API_URL)
        .get('/api/appointments')
        .query({ patientId: 'test-patient-id' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((apt: any) => {
        expect(apt.patientId).toBe('test-patient-id');
      });
    });

    it('should filter by status', async () => {
      const response = await request(API_URL)
        .get('/api/appointments')
        .query({ status: 'scheduled' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((apt: any) => {
        expect(apt.status).toBe('scheduled');
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const response = await request(API_URL)
        .get('/api/appointments')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Appointment History', () => {
    it('should get appointment history', async () => {
      const response = await request(API_URL)
        .get(`/api/appointments/${appointmentId}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should reject past appointment dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await request(API_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId: 'test-doctor-id',
          patientId: 'test-patient-id',
          appointmentDate: pastDate.toISOString(),
          appointmentTime: '10:00',
          type: 'consultation'
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid appointment type', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(API_URL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId: 'test-doctor-id',
          patientId: 'test-patient-id',
          appointmentDate: futureDate.toISOString(),
          appointmentTime: '10:00',
          type: 'invalid-type'
        });

      expect(response.status).toBe(400);
    });
  });
});
