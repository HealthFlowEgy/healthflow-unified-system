import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * Integration tests for Authentication Service
 * 
 * These tests verify the complete authentication workflow including:
 * - User registration
 * - Login with valid credentials
 * - Login with invalid credentials
 * - JWT token validation
 * - Token refresh
 * - Logout
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4003';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000';

describe('Authentication Service Integration Tests', () => {
  let accessToken: string;
  let refreshToken: string;
  const testUser = {
    email: `test-${Date.now()}@healthflow.test`,
    password: 'Test123!@#Secure',
    name: 'Test User',
    role: 'doctor'
  };

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: `weak-${Date.now()}@healthflow.test`,
          password: '12345678' // Too weak
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already exists/i);
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.token_type).toBe('Bearer');

      // Store tokens for subsequent tests
      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should reject login with invalid password', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid credentials/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@healthflow.test',
          password: 'SomePassword123!'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limiting on login attempts', async () => {
      // Make multiple failed login attempts
      const attempts = Array(15).fill(null).map(() =>
        request(API_GATEWAY_URL)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword'
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    }, 30000);
  });

  describe('Token Validation', () => {
    it('should access protected endpoint with valid token', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject access without token', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/authentication required/i);
    });

    it('should reject access with invalid token', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid token/i);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.access_token).not.toBe(accessToken);

      // Update access token
      accessToken = response.body.access_token;
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid.refresh.token' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Logout', () => {
    it('should logout and invalidate tokens', async () => {
      const response = await request(API_GATEWAY_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/logged out/i);
    });

    it('should reject access with logged out token', async () => {
      const response = await request(API_GATEWAY_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/revoked|invalid/i);
    });
  });

  afterAll(async () => {
    // Clean up test user if needed
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});
