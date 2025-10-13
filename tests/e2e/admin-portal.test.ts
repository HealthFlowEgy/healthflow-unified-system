/**
 * E2E Tests for Admin Portal
 * Tests complete user workflows in the Admin Portal
 */

import request from 'supertest';
import { app } from '../../services/api-gateway/src/index';

describe('Admin Portal E2E Tests', () => {
  let adminToken: string;
  let userId: string;
  let roleId: string;
  let organizationId: string;

  beforeAll(async () => {
    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'AdminPassword123!'
      });

    adminToken = loginResponse.body.data.token;
  });

  describe('User Management Workflow', () => {
    it('should create a new organization', async () => {
      const response = await request(app)
        .post('/api/user-management/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Hospital',
          type: 'hospital',
          address: '123 Test St, Cairo, Egypt',
          phone: '+201234567890',
          email: 'contact@testhospital.eg'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Hospital');
      organizationId = response.body.data.id;
    });

    it('should create a new role', async () => {
      const response = await request(app)
        .post('/api/user-management/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Role',
          description: 'Role for testing',
          permissions: ['users.read', 'users.create']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Role');
      roleId = response.body.data.id;
    });

    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/user-management/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'testuser@healthflow.eg',
          firstName: 'Test',
          lastName: 'User',
          organizationId,
          roleIds: [roleId]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('testuser@healthflow.eg');
      userId = response.body.data.id;
    });

    it('should list users with pagination', async () => {
      const response = await request(app)
        .get('/api/user-management/users?limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get user details', async () => {
      const response = await request(app)
        .get(`/api/user-management/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe('testuser@healthflow.eg');
    });

    it('should update user information', async () => {
      const response = await request(app)
        .put(`/api/user-management/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'User'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });

    it('should get user activity', async () => {
      const response = await request(app)
        .get(`/api/user-management/activity?userId=${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should deactivate user', async () => {
      const response = await request(app)
        .patch(`/api/user-management/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('inactive');
    });

    it('should activate user', async () => {
      const response = await request(app)
        .patch(`/api/user-management/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
    });
  });

  describe('Role Management Workflow', () => {
    it('should list all roles', async () => {
      const response = await request(app)
        .get('/api/user-management/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get role details', async () => {
      const response = await request(app)
        .get(`/api/user-management/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(roleId);
    });

    it('should update role permissions', async () => {
      const response = await request(app)
        .put(`/api/user-management/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['users.read', 'users.create', 'users.update']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toContain('users.update');
    });
  });

  describe('Organization Management Workflow', () => {
    it('should list all organizations', async () => {
      const response = await request(app)
        .get('/api/user-management/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get organization details', async () => {
      const response = await request(app)
        .get(`/api/user-management/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(organizationId);
    });

    it('should update organization', async () => {
      const response = await request(app)
        .put(`/api/user-management/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Hospital Name'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Hospital Name');
    });
  });

  describe('Analytics Workflow', () => {
    it('should get system metrics', async () => {
      const response = await request(app)
        .get('/api/bi-dashboard/analytics/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.totalPrescriptions).toBeDefined();
    });

    it('should get prescription trends', async () => {
      const response = await request(app)
        .get('/api/bi-dashboard/analytics/trends/prescriptions?period=30d')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get top doctors', async () => {
      const response = await request(app)
        .get('/api/bi-dashboard/analytics/top-doctors?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Report Generation Workflow', () => {
    let reportId: string;

    it('should create a report', async () => {
      const response = await request(app)
        .post('/api/bi-dashboard/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Monthly User Report',
          type: 'users',
          schedule: 'monthly',
          format: 'pdf'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      reportId = response.body.data.id;
    });

    it('should execute report', async () => {
      const response = await request(app)
        .post(`/api/bi-dashboard/reports/${reportId}/execute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'pdf'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should list reports', async () => {
      const response = await request(app)
        .get('/api/bi-dashboard/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should delete test user', async () => {
      await request(app)
        .delete(`/api/user-management/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should delete test role', async () => {
      await request(app)
        .delete(`/api/user-management/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should delete test organization', async () => {
      await request(app)
        .delete(`/api/user-management/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});

describe('Admin Portal Authentication', () => {
  it('should reject requests without token', async () => {
    await request(app)
      .get('/api/user-management/users')
      .expect(401);
  });

  it('should reject requests with invalid token', async () => {
    await request(app)
      .get('/api/user-management/users')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject non-admin users', async () => {
    // Login as regular user
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@healthflow.eg',
        password: 'UserPassword123!'
      });

    const userToken = loginResponse.body.data.token;

    await request(app)
      .get('/api/user-management/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
