// Sprint 2 - Dispensing Workflow Tests
// ------------------------------------------------------------------------------

import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { db } from './setup';
import { 
  users, 
  tenants, 
  pharmacies, 
  prescriptions, 
  medicines, 
  pharmacyInventory 
} from '../src/database/schema';

describe('Dispensing Workflow', () => {
  let testUser: any;
  let pharmacyId: string;
  let prescriptionId: string;
  let medicineId: string;
  let inventoryItemId: string;

  beforeEach(async () => {
    // Setup test data
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Tenant',
      slug: 'disp-test',
      type: 'pharmacy',
      status: 'active'
    }).returning();

    [testUser] = await db.insert(users).values({
      email: 'disp@test.com',
      passwordHash: 'hash',
      fullName: 'Dispensing Tester',
      role: 'pharmacist',
      status: 'active',
      tenantId: tenant.id
    }).returning();

    // Create doctor
    const [doctor] = await db.insert(users).values({
      email: 'doctor@test.com',
      passwordHash: 'hash',
      fullName: 'Dr. Test',
      role: 'doctor',
      status: 'active'
    }).returning();

    [{ id: pharmacyId }] = await db.insert(pharmacies).values({
      licenseNumber: 'PH-DISP-001',
      pharmacyName: 'Dispensing Test Pharmacy',
      ownerName: 'Owner',
      address: 'Address',
      city: 'Cairo',
      governorate: 'Cairo',
      phone: '+20123456789',
      email: 'disp@pharmacy.com',
      status: 'active',
      tenantId: tenant.id
    }).returning();

    [{ id: medicineId }] = await db.insert(medicines).values({
      edaNumber: 'EDA-DISP-001',
      tradeName: 'Dispense Med',
      scientificName: 'Scientific Name',
      manufacturer: 'Pharma',
      dosageForm: 'tablet',
      strength: '500mg',
      status: 'active'
    }).returning();

    [{ id: inventoryItemId }] = await db.insert(pharmacyInventory).values({
      pharmacyId,
      medicineId,
      batchNumber: 'DISP-BATCH-001',
      quantity: 100,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      sellingPrice: '15.00',
      status: 'in_stock'
    }).returning();

    [{ id: prescriptionId }] = await db.insert(prescriptions).values({
      prescriptionNumber: 'RX-DISP-001',
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      patientName: 'Test Patient',
      patientAge: 35,
      medications: [{
        medicineId,
        name: 'Dispense Med',
        dosage: '500mg',
        frequency: 'twice daily',
        duration: '7 days',
        quantity: 14
      }],
      status: 'validated'
    }).returning();
  });

  describe('GET /api/v2/dispensing/:pharmacyId/prescriptions/pending', () => {
    test('should get pending prescriptions', async () => {
      const response = await request(app)
        .get(`/api/v2/dispensing/${pharmacyId}/prescriptions/pending`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v2/dispensing/:pharmacyId/dispense', () => {
    test('should dispense prescription successfully', async () => {
      const dispensingData = {
        prescriptionId,
        medications: [{
          inventoryItemId,
          medicineId,
          name: 'Dispense Med',
          quantity: 14,
          price: 15.0,
          batchNumber: 'DISP-BATCH-001'
        }],
        paymentMethod: 'cash',
        counselingNotes: 'Take with food'
      };

      const response = await request(app)
        .post(`/api/v2/dispensing/${pharmacyId}/dispense`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist')
        .send(dispensingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.totalAmount).toBe('210.00');
    });

    test('should fail with insufficient stock', async () => {
      const dispensingData = {
        prescriptionId,
        medications: [{
          inventoryItemId,
          medicineId,
          name: 'Dispense Med',
          quantity: 200, // More than available
          price: 15.0,
          batchNumber: 'DISP-BATCH-001'
        }],
        paymentMethod: 'cash'
      };

      const response = await request(app)
        .post(`/api/v2/dispensing/${pharmacyId}/dispense`)
        .set('X-User-Id', testUser.id)
        .set('X-User-Role', 'pharmacist')
        .send(dispensingData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });
});