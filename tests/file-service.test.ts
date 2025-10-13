import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('File Service', () => {
  let authToken: string;
  let fileId: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@healthflow.com', password: 'admin123' });
    authToken = response.body.data.token;
  });

  describe('POST /api/files/upload', () => {
    it('should upload a file', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'Test file content');

      const response = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      fileId = response.body.data.id;

      fs.unlinkSync(testFilePath);
    });
  });

  describe('GET /api/files', () => {
    it('should list files', async () => {
      const response = await request(API_URL)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
