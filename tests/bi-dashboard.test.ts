import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('BI Dashboard Service', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@healthflow.com', password: 'admin123' });
    authToken = response.body.data.token;
  });

  describe('GET /api/analytics/metrics', () => {
    it('should get system metrics', async () => {
      const response = await request(API_URL)
        .get('/api/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPatients');
      expect(response.body.data).toHaveProperty('totalDoctors');
    });
  });

  describe('GET /api/analytics/trends/appointments', () => {
    it('should get appointment trends', async () => {
      const response = await request(API_URL)
        .get('/api/analytics/trends/appointments')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
