import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('User Management Service', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@healthflow.com', password: 'admin123' });
    authToken = response.body.data.token;
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(API_URL)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      userId = response.body.data.id;
    });
  });

  describe('GET /api/users', () => {
    it('should list all users', async () => {
      const response = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get a specific user', async () => {
      const response = await request(API_URL)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user', async () => {
      const response = await request(API_URL)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Updated' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      const response = await request(API_URL)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
