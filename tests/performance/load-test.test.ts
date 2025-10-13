/**
 * Performance and Load Tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('Performance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    authToken = response.body.data.token;
  });

  it('should respond to health check within 100ms', async () => {
    const start = Date.now();
    const response = await request(API_URL).get('/health');
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100);
  });

  it('should handle 10 concurrent requests', async () => {
    const promises = Array(10).fill(null).map(() =>
      request(API_URL)
        .get('/api/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const responses = await Promise.all(promises);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
