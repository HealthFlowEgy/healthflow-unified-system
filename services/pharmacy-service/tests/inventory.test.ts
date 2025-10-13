// Sprint 2 - Inventory Management Tests
// ------------------------------------------------------------------------------

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { db } from './setup';
import { users, tenants, pharmacies, medicines, pharmacyInventory } from '../src/database/schema';

describe('Inventory Management', () => {
  let testUser: any;
  let pharmacyId: string;
  let medicineId: string;

  beforeEach(async () => {
    // Create test data
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Tenant',
      slug: 'test',
      type: 'pharmacy',
      status: 'active'
    }).returning();

    [testUser] = await db.insert(users).values({
      email: 'inv@test.com',
      passwordHash: 'hash',
      fullName: 'Inventory Tester',
      role: 'pharmacist',
      status: 'active',
      tenantId: tenant.id
    }).returning();

    [{ id: pharmacyId }] = await db.insert(pharmacies).values({
      licenseNumber: 'PH-INV-001',
      pharmacyName: 'Inventory Test Pharmacy',
      ownerName: 'Owner',
      address: 'Address',
      city: 'Cairo',
      governorate: 'Cairo',
      phone: '+20123456789',
      email: 'inv@pharmacy.com',
      status: 'active',
      tenantId: tenant.id
    }).returning();

    [{ id: medicineId }] = await db.insert(medicines).values({
      edaNumber: 'EDA-INV-001',
      tradeName: 'Test Medicine',
      scientificName: 'Test Scientific',
      manufacturer: 'Test Pharma',
      dosageForm: 'tablet',
      strength: '500mg',
      status: 'active'
    }).returning();
  });

  describe('POST /api/v2/inventory/:pharmacyId/items', () => {
    test('should add inventory item', async () => {
      const itemData = {
        medicineId,
        batchNumber: 'BATCH-001',
        quantity: 100,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purchasePrice: 10.5,
        sellingPrice: 15.0,
        minStockLevel: 20
      };

      const response = await request(app)
        .post(`/api/v2/inventory/${pharmacyId}/items`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist')
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(100);
      expect(response.body.data.batchNumber).toBe('BATCH-001');
    });

    test('should fail with invalid expiry date', async () => {
      const itemData = {
        medicineId,
        batchNumber: 'BATCH-002',
        quantity: 50,
        expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Past date
        sellingPrice: 15.0
      };

      const response = await request(app)
        .post(`/api/v2/inventory/${pharmacyId}/items`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist')
        .send(itemData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v2/inventory/:pharmacyId', () => {
    beforeEach(async () => {
      // Add test inventory items
      await db.insert(pharmacyInventory).values([
        {
          pharmacyId,
          medicineId,
          batchNumber: 'BATCH-GET-001',
          quantity: 100,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          sellingPrice: '15.00',
          status: 'in_stock'
        },
        {
          pharmacyId,
          medicineId,
          batchNumber: 'BATCH-GET-002',
          quantity: 5,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          sellingPrice: '15.00',
          minStockLevel: 10,
          status: 'low_stock'
        }
      ]);
    });

    test('should get all inventory items', async () => {
      const response = await request(app)
        .get(`/api/v2/inventory/${pharmacyId}`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.summary).toHaveProperty('totalItems');
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/v2/inventory/${pharmacyId}?status=low_stock`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(200);
      expect(response.body.data.items[0].status).toBe('low_stock');
    });
  });

  describe('GET /api/v2/inventory/:pharmacyId/low-stock', () => {
    test('should get low stock items', async () => {
      await db.insert(pharmacyInventory).values({
        pharmacyId,
        medicineId,
        batchNumber: 'LOW-001',
        quantity: 5,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        sellingPrice: '15.00',
        minStockLevel: 10,
        status: 'low_stock'
      });

      const response = await request(app)
        .get(`/api/v2/inventory/${pharmacyId}/low-stock`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});

// ------------------------------------------------------------------------------