/**
 * User Management Service Unit Tests
 * Comprehensive test suite for user management functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('User Management Service', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Login as admin to get auth token
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    authToken = response.body.data.token;
  });

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const response = await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `test${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          password: 'Test@123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toContain('test');

      testUserId = response.body.data.id;
    });

    it('should get user by ID', async () => {
      const response = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
    });

    it('should list all users', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should update user', async () => {
      const response = await request(API_URL)
        .put(`/api/user-management/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });

    it('should activate user', async () => {
      const response = await request(API_URL)
        .post(`/api/user-management/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deactivate user', async () => {
      const response = await request(API_URL)
        .post(`/api/user-management/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete user', async () => {
      const response = await request(API_URL)
        .delete(`/api/user-management/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('User Validation', () => {
    it('should reject invalid email', async () => {
      const response = await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          password: 'Test@123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `test${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const email = `test${Date.now()}@example.com`;

      // Create first user
      await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email,
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          password: 'Test@123'
        });

      // Try to create duplicate
      const response = await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email,
          firstName: 'Test2',
          lastName: 'User2',
          role: 'patient',
          password: 'Test@123'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Activity Tracking', () => {
    it('should get user activity log', async () => {
      const response = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}/activity`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });

    it('should filter activity by action', async () => {
      const response = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}/activity`)
        .query({ action: 'login' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter activity by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}/activity`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('User Session Management', () => {
    it('should get user sessions', async () => {
      const response = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}/sessions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should terminate specific session', async () => {
      // Get sessions first
      const sessionsResponse = await request(API_URL)
        .get(`/api/user-management/users/${testUserId}/sessions`)
        .set('Authorization', `Bearer ${authToken}`);

      if (sessionsResponse.body.data.length > 0) {
        const sessionId = sessionsResponse.body.data[0].id;

        const response = await request(API_URL)
          .delete(`/api/user-management/users/${testUserId}/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('User Statistics', () => {
    it('should get user statistics', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('byRole');
    });
  });

  describe('Password Management', () => {
    it('should reset user password', async () => {
      const response = await request(API_URL)
        .post(`/api/user-management/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'NewPassword@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject weak password on reset', async () => {
      const response = await request(API_URL)
        .post(`/api/user-management/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without auth token', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject non-admin users from admin endpoints', async () => {
      // Login as regular user
      const userResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'patient@healthflow.eg',
          password: 'Patient@123'
        });

      const userToken = userResponse.body.data.token;

      const response = await request(API_URL)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: `test${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          password: 'Test@123'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Pagination and Filtering', () => {
    it('should paginate user list', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter users by role', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users')
        .query({ role: 'patient' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('patient');
      });
    });

    it('should search users by name', async () => {
      const response = await request(API_URL)
        .get('/api/user-management/users')
        .query({ search: 'test' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

