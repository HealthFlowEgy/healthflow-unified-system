/**
 * BI Dashboard Service Integration Tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('BI Dashboard Service', () => {
  let authToken: string;
  let dashboardId: string;
  let widgetId: string;
  let reportId: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    authToken = response.body.data.token;
  });

  describe('Dashboard Management', () => {
    it('should create a dashboard', async () => {
      const response = await request(API_URL)
        .post('/api/bi-dashboard/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Dashboard',
          description: 'Test dashboard for integration tests',
          layout: { columns: 12, rows: 8 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      dashboardId = response.body.data.id;
    });

    it('should list dashboards', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/dashboards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get dashboard by ID', async () => {
      const response = await request(API_URL)
        .get(`/api/bi-dashboard/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(dashboardId);
    });

    it('should update dashboard', async () => {
      const response = await request(API_URL)
        .put(`/api/bi-dashboard/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Dashboard'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Dashboard');
    });
  });

  describe('Widget Management', () => {
    it('should create a widget', async () => {
      const response = await request(API_URL)
        .post(`/api/bi-dashboard/dashboards/${dashboardId}/widgets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'chart',
          title: 'Test Chart',
          config: {
            chartType: 'line',
            dataSource: 'prescriptions'
          },
          position: { x: 0, y: 0, w: 6, h: 4 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      widgetId = response.body.data.id;
    });

    it('should list widgets', async () => {
      const response = await request(API_URL)
        .get(`/api/bi-dashboard/dashboards/${dashboardId}/widgets`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update widget', async () => {
      const response = await request(API_URL)
        .put(`/api/bi-dashboard/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Chart'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Chart');
    });

    it('should delete widget', async () => {
      const response = await request(API_URL)
        .delete(`/api/bi-dashboard/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Analytics', () => {
    it('should get system metrics', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalPrescriptions');
    });

    it('should get prescription trends', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/analytics/trends/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '30d' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get user growth', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/analytics/trends/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '30d' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get top doctors', async () => {
      const response = await request(API_URL)
        .get('/api/bi-dashboard/analytics/top-doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Reports', () => {
    it('should create a report', async () => {
      const response = await request(API_URL)
        .post('/api/bi-dashboard/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Report',
          type: 'prescription_summary',
          schedule: 'daily'
        });

      expect(response.status).toBe(201);
      reportId = response.body.data.id;
    });

    it('should execute a report', async () => {
      const response = await request(API_URL)
        .post(`/api/bi-dashboard/reports/${reportId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
          parameters: {}
        });

      expect(response.status).toBe(200);
    });

    it('should list report executions', async () => {
      const response = await request(API_URL)
        .get(`/api/bi-dashboard/reports/${reportId}/executions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
