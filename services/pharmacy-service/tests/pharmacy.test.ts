// Sprint 2 - Pharmacy Management Tests
// ------------------------------------------------------------------------------

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { db } from './setup';
import { users, tenants, pharmacies } from '../src/database/schema';
import bcrypt from 'bcryptjs';

describe('Pharmacy Management', () => {
  let authToken: string;
  let pharmacyId: string;
  let testUser: any;
  let testTenant: any;

  beforeEach(async () => {
    // Create tenant
    [testTenant] = await db.insert(tenants).values({
      name: 'Test Tenant',
      slug: 'test-tenant',
      type: 'pharmacy_chain',
      status: 'active'
    }).returning();

    // Create test user (pharmacist)
    const passwordHash = await bcrypt.hash('Test123!', 12);
    [testUser] = await db.insert(users).values({
      email: 'pharmacist@test.com',
      passwordHash,
      fullName: 'Test Pharmacist',
      role: 'pharmacist',
      status: 'active',
      tenantId: testTenant.id
    }).returning();

    // Mock authentication token
    authToken = 'mock-token';
  });

  describe('POST /api/v2/pharmacy/register', () => {
    test('should register a new pharmacy', async () => {
      const pharmacyData = {
        licenseNumber: 'PH-TEST-001',
        pharmacyName: 'Test Pharmacy',
        ownerName: 'John Doe',
        address: '123 Test Street, Test City',
        city: 'Cairo',
        governorate: 'Cairo',
        phone: '+201234567890',
        email: 'test@pharmacy.com',
        operatingHours: {
          monday: '09:00-21:00',
          tuesday: '09:00-21:00',
          wednesday: '09:00-21:00',
          thursday: '09:00-21:00',
          friday: '09:00-21:00',
          saturday: '09:00-21:00',
          sunday: '10:00-18:00'
        }
      };

      const response = await request(app)
        .post('/api/v2/pharmacy/register')
        .set('X-User-Id', testUser.id)
        .set('X-User-Email', testUser.email)
        .set('X-User-Role', testUser.role)
        .send(pharmacyData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.pharmacyName).toBe('Test Pharmacy');
      expect(response.body.data.status).toBe('pending');

      pharmacyId = response.body.data.id;
    });

    test('should fail with duplicate license number', async () => {
      // Create existing pharmacy
      await db.insert(pharmacies).values({
        licenseNumber: 'PH-DUP-001',
        pharmacyName: 'Existing Pharmacy',
        ownerName: 'Jane Doe',
        address: '456 Test Street',
        city: 'Cairo',
        governorate: 'Cairo',
        phone: '+201234567891',
        email: 'existing@pharmacy.com',
        status: 'active'
      });

      const response = await request(app)
        .post('/api/v2/pharmacy/register')
        .set('X-User-Id', testUser.id)
        .set('X-User-Email', testUser.email)
        .set('X-User-Role', testUser.role)
        .send({
          licenseNumber: 'PH-DUP-001',
          pharmacyName: 'Duplicate Pharmacy',
          ownerName: 'John Doe',
          address: '789 Test Street',
          city: 'Cairo',
          governorate: 'Cairo',
          phone: '+201234567892',
          email: 'duplicate@pharmacy.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PHARMACY_EXISTS');
    });
  });

  describe('GET /api/v2/pharmacy', () => {
    beforeEach(async () => {
      // Create test pharmacies
      [{ id: pharmacyId }] = await db.insert(pharmacies).values([
        {
          licenseNumber: 'PH-LIST-001',
          pharmacyName: 'Pharmacy One',
          ownerName: 'Owner One',
          address: '123 Street',
          city: 'Cairo',
          governorate: 'Cairo',
          phone: '+201111111111',
          email: 'one@pharmacy.com',
          status: 'active',
          tenantId: testTenant.id
        },
        {
          licenseNumber: 'PH-LIST-002',
          pharmacyName: 'Pharmacy Two',
          ownerName: 'Owner Two',
          address: '456 Street',
          city: 'Alexandria',
          governorate: 'Alexandria',
          phone: '+201222222222',
          email: 'two@pharmacy.com',
          status: 'pending',
          tenantId: testTenant.id
        }
      ]).returning();
    });

    test('should list all pharmacies', async () => {
      const response = await request(app)
        .get('/api/v2/pharmacy')
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
    });

    test('should filter pharmacies by status', async () => {
      const response = await request(app)
        .get('/api/v2/pharmacy?status=active')
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].status).toBe('active');
    });

    test('should search pharmacies by name', async () => {
      const response = await request(app)
        .get('/api/v2/pharmacy?search=Pharmacy One')
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].pharmacyName).toBe('Pharmacy One');
    });
  });

  describe('GET /api/v2/pharmacy/:id', () => {
    beforeEach(async () => {
      [{ id: pharmacyId }] = await db.insert(pharmacies).values({
        licenseNumber: 'PH-GET-001',
        pharmacyName: 'Get Test Pharmacy',
        ownerName: 'Test Owner',
        address: '789 Street',
        city: 'Cairo',
        governorate: 'Cairo',
        phone: '+201333333333',
        email: 'get@pharmacy.com',
        status: 'active',
        tenantId: testTenant.id
      }).returning();
    });

    test('should get pharmacy by ID', async () => {
      const response = await request(app)
        .get(`/api/v2/pharmacy/${pharmacyId}`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(pharmacyId);
      expect(response.body.data.pharmacyName).toBe('Get Test Pharmacy');
    });

    test('should return 404 for non-existent pharmacy', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v2/pharmacy/${fakeId}`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v2/pharmacy/:id', () => {
    beforeEach(async () => {
      [{ id: pharmacyId }] = await db.insert(pharmacies).values({
        licenseNumber: 'PH-UPD-001',
        pharmacyName: 'Update Test Pharmacy',
        ownerName: 'Test Owner',
        address: '321 Street',
        city: 'Cairo',
        governorate: 'Cairo',
        phone: '+201444444444',
        email: 'update@pharmacy.com',
        status: 'active',
        tenantId: testTenant.id
      }).returning();
    });

    test('should update pharmacy details', async () => {
      const updates = {
        pharmacyName: 'Updated Pharmacy Name',
        phone: '+201555555555'
      };

      const response = await request(app)
        .put(`/api/v2/pharmacy/${pharmacyId}`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pharmacyName).toBe('Updated Pharmacy Name');
      expect(response.body.data.phone).toBe('+201555555555');
    });
  });
});

// ------------------------------------------------------------------------------