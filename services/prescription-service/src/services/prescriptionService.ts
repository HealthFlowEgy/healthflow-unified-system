/**
 * Prescription Service
 * Business logic for prescription management
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import db from '../config/database';
import {
  prescriptions,
  prescriptionItems,
  prescriptionHistory,
  type Prescription,
  type NewPrescription,
  type PrescriptionItem,
  type NewPrescriptionItem
} from '../models/schema';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '../utils/logger';

const AI_VALIDATION_SERVICE_URL = process.env.AI_VALIDATION_SERVICE_URL || 'http://ai-validation-service:5000';

export class PrescriptionService {
  /**
   * Create a new prescription with medications
   */
  async createPrescription(data: any) {
    const prescriptionNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start transaction
    return await db.transaction(async (tx) => {
      // Create prescription
      const [prescription] = await tx.insert(prescriptions).values({
        prescriptionNumber,
        doctorId: data.doctor.id,
        doctorName: data.doctor.name,
        doctorLicense: data.doctor.license,
        doctorSpecialty: data.doctor.specialty,
        patientId: data.patient.id,
        patientName: data.patient.name,
        patientAge: data.patient.age,
        patientGender: data.patient.gender,
        patientNationalId: data.patient.nationalId,
        diagnosis: data.diagnosis,
        clinicalNotes: data.clinicalNotes,
        status: 'draft',
        tenantId: data.tenantId,
        createdBy: data.createdBy
      }).returning();

      // Create prescription items
      const itemsData: NewPrescriptionItem[] = data.medications.map((med: any) => ({
        prescriptionId: prescription.id,
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        medicineGenericName: med.medicineGenericName,
        medicineStrength: med.medicineStrength,
        medicineForm: med.medicineForm,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity,
        refills: med.refills || 0,
        instructions: med.instructions,
        warnings: med.warnings,
        substitutionAllowed: med.substitutionAllowed
      }));

      const items = await tx.insert(prescriptionItems).values(itemsData).returning();

      // Create history record
      await tx.insert(prescriptionHistory).values({
        prescriptionId: prescription.id,
        action: 'created',
        performedBy: data.createdBy,
        notes: 'Prescription created'
      });

      return {
        ...prescription,
        items
      };
    });
  }

  /**
   * Get prescription by ID with items
   */
  async getPrescriptionById(id: string, tenantId: string) {
    const prescription = await db.query.prescriptions.findFirst({
      where: and(
        eq(prescriptions.id, id),
        eq(prescriptions.tenantId, tenantId)
      ),
      with: {
        items: true
      }
    });

    return prescription;
  }

  /**
   * Get prescriptions with filters and pagination
   */
  async getPrescriptions(filters: any, pagination: { page: number; limit: number }) {
    const conditions = [eq(prescriptions.tenantId, filters.tenantId)];

    if (filters.patientId) {
      conditions.push(eq(prescriptions.patientId, filters.patientId));
    }

    if (filters.doctorId) {
      conditions.push(eq(prescriptions.doctorId, filters.doctorId));
    }

    if (filters.status) {
      conditions.push(eq(prescriptions.status, filters.status));
    }

    if (filters.from) {
      conditions.push(gte(prescriptions.prescriptionDate, new Date(filters.from)));
    }

    if (filters.to) {
      conditions.push(lte(prescriptions.prescriptionDate, new Date(filters.to)));
    }

    const offset = (pagination.page - 1) * pagination.limit;

    const [prescriptionsList, [{ count }]] = await Promise.all([
      db.query.prescriptions.findMany({
        where: and(...conditions),
        orderBy: [desc(prescriptions.createdAt)],
        limit: pagination.limit,
        offset,
        with: {
          items: true
        }
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(prescriptions)
        .where(and(...conditions))
    ]);

    return {
      prescriptions: prescriptionsList,
      total: Number(count),
      page: pagination.page,
      limit: pagination.limit
    };
  }

  /**
   * Submit prescription for AI validation
   */
  async submitForValidation(prescriptionId: string, tenantId: string, userId: string) {
    // Get prescription with items
    const prescription = await this.getPrescriptionById(prescriptionId, tenantId);

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    if (prescription.status !== 'draft') {
      throw new Error('Only draft prescriptions can be submitted for validation');
    }

    try {
      // Call AI Validation Service
      const response = await axios.post(
        `${AI_VALIDATION_SERVICE_URL}/api/v1/validate/prescription`,
        {
          prescriptionId: prescription.id,
          prescriptionNumber: prescription.prescriptionNumber,
          doctor: {
            name: prescription.doctorName,
            license: prescription.doctorLicense
          },
          patient: {
            name: prescription.patientName,
            age: prescription.patientAge
          },
          medications: prescription.items.map((item: PrescriptionItem) => ({
            name: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity
          }))
        },
        {
          timeout: 30000
        }
      );

      const validationResult = response.data;

      // Update prescription with validation result
      const [updated] = await db.update(prescriptions)
        .set({
          status: validationResult.valid ? 'validated' : 'validation_failed',
          aiValidationStatus: validationResult.valid ? 'passed' : 'failed',
          aiValidationScore: validationResult.confidence,
          aiValidationResult: validationResult,
          updatedAt: new Date()
        })
        .where(and(
          eq(prescriptions.id, prescriptionId),
          eq(prescriptions.tenantId, tenantId)
        ))
        .returning();

      // Create history record
      await db.insert(prescriptionHistory).values({
        prescriptionId,
        action: 'validated',
        performedBy: userId,
        notes: `AI validation ${validationResult.valid ? 'passed' : 'failed'} with confidence ${validationResult.confidence}`,
        changes: validationResult
      });

      return {
        prescription: updated,
        validation: validationResult
      };
    } catch (error: any) {
      logger.error('AI validation failed:', error);
      
      // Update prescription status to validation error
      await db.update(prescriptions)
        .set({
          status: 'validation_error',
          aiValidationStatus: 'error',
          updatedAt: new Date()
        })
        .where(eq(prescriptions.id, prescriptionId));

      throw new Error('AI validation service error');
    }
  }

  /**
   * Update prescription status
   */
  async updateStatus(
    prescriptionId: string,
    newStatus: string,
    tenantId: string,
    userId: string,
    reason?: string
  ) {
    const [updated] = await db.update(prescriptions)
      .set({
        status: newStatus,
        ...(newStatus === 'approved' && { approvedBy: userId, approvedAt: new Date() }),
        ...(newStatus === 'rejected' && { rejectionReason: reason }),
        updatedAt: new Date()
      })
      .where(and(
        eq(prescriptions.id, prescriptionId),
        eq(prescriptions.tenantId, tenantId)
      ))
      .returning();

    // Create history record
    await db.insert(prescriptionHistory).values({
      prescriptionId,
      action: `status_changed_to_${newStatus}`,
      performedBy: userId,
      notes: reason || `Status changed to ${newStatus}`
    });

    return updated;
  }

  /**
   * Get prescription history
   */
  async getPrescriptionHistory(prescriptionId: string, tenantId: string) {
    // First verify prescription belongs to tenant
    const prescription = await db.query.prescriptions.findFirst({
      where: and(
        eq(prescriptions.id, prescriptionId),
        eq(prescriptions.tenantId, tenantId)
      )
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    const history = await db.query.prescriptionHistory.findMany({
      where: eq(prescriptionHistory.prescriptionId, prescriptionId),
      orderBy: [desc(prescriptionHistory.timestamp)]
    });

    return history;
  }

  /**
   * Soft delete prescription
   */
  async deletePrescription(prescriptionId: string, tenantId: string, userId: string) {
    const [deleted] = await db.update(prescriptions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(prescriptions.id, prescriptionId),
        eq(prescriptions.tenantId, tenantId)
      ))
      .returning();

    // Create history record
    await db.insert(prescriptionHistory).values({
      prescriptionId,
      action: 'deleted',
      performedBy: userId,
      notes: 'Prescription deleted'
    });

    return deleted;
  }
}

export const prescriptionService = new PrescriptionService();