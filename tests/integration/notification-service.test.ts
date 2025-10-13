/**
 * Notification Service Integration Tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Notification Service', () => {
  let authToken: string;
  let notificationId: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    authToken = response.body.data.token;
  });

  describe('Email Notifications', () => {
    it('should send email notification', async () => {
      const response = await request(API_URL)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          recipient: 'test@example.com',
          subject: 'Test Email',
          message: 'This is a test email'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      notificationId = response.body.data.id;
    });

    it('should send email from template', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/send-from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          templateId: 'appointment_confirmation',
          recipient: 'test@example.com',
          data: {
            patientName: 'John Doe',
            appointmentDate: '2025-10-15',
            appointmentTime: '10:00 AM',
            doctorName: 'Dr. Smith'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(API_URL)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          recipient: 'invalid-email',
          subject: 'Test',
          message: 'Test'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('SMS Notifications', () => {
    it('should send SMS notification', async () => {
      const response = await request(API_URL)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'sms',
          recipient: '+201234567890',
          message: 'Test SMS'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should send SMS from template', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/send-from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'sms',
          templateId: 'appointment_reminder',
          recipient: '+201234567890',
          data: {
            patientName: 'John Doe',
            appointmentDate: '2025-10-15',
            appointmentTime: '10:00 AM'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should validate phone number format', async () => {
      const response = await request(API_URL)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'sms',
          recipient: 'invalid-phone',
          message: 'Test'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Notification Management', () => {
    it('should list notifications', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get notification by ID', async () => {
      const response = await request(API_URL)
        .get(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(notificationId);
    });

    it('should mark notification as read', async () => {
      const response = await request(API_URL)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter notifications by type', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .query({ type: 'email' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((notif: any) => {
        expect(notif.type).toBe('email');
      });
    });

    it('should filter notifications by status', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .query({ status: 'sent' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((notif: any) => {
        expect(notif.status).toBe('sent');
      });
    });
  });

  describe('Templates', () => {
    it('should list notification templates', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get template by ID', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/templates/appointment_confirmation')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('content');
    });
  });
});
