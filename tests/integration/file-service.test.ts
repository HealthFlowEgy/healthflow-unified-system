/**
 * File Service Integration Tests
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:8000';

describe('File Service Integration', () => {
  let authToken: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@healthflow.eg',
        password: 'Admin@123'
      });

    authToken = response.body.data.token;
  });

  describe('File Upload', () => {
    it('should upload a file', async () => {
      const testFile = Buffer.from('Test file content');
      
      const response = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile, 'test.txt');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('url');

      uploadedFileId = response.body.data.id;
    });

    it('should upload multiple files', async () => {
      const testFile1 = Buffer.from('Test file 1');
      const testFile2 = Buffer.from('Test file 2');

      const response = await request(API_URL)
        .post('/api/files/upload-multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testFile1, 'test1.txt')
        .attach('files', testFile2, 'test2.txt');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should reject files exceeding size limit', async () => {
      const largeFile = Buffer.alloc(20 * 1024 * 1024); // 20MB

      const response = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized file types', async () => {
      const testFile = Buffer.from('Test file');

      const response = await request(API_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile, 'test.exe');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File Retrieval', () => {
    it('should list files', async () => {
      const response = await request(API_URL)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get file by ID', async () => {
      const response = await request(API_URL)
        .get(`/api/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(uploadedFileId);
    });

    it('should download file', async () => {
      const response = await request(API_URL)
        .get(`/api/files/${uploadedFileId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application');
    });

    it('should get signed URL', async () => {
      const response = await request(API_URL)
        .get(`/api/files/${uploadedFileId}/url`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.url).toContain('http');
    });
  });

  describe('File Sharing', () => {
    it('should share file with user', async () => {
      const response = await request(API_URL)
        .post(`/api/files/${uploadedFileId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-id',
          permission: 'read'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should list file shares', async () => {
      const response = await request(API_URL)
        .get(`/api/files/${uploadedFileId}/shares`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('File Statistics', () => {
    it('should get file statistics', async () => {
      const response = await request(API_URL)
        .get('/api/files/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
    });
  });

  describe('File Deletion', () => {
    it('should delete file', async () => {
      const response = await request(API_URL)
        .delete(`/api/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for deleted file', async () => {
      const response = await request(API_URL)
        .get(`/api/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
