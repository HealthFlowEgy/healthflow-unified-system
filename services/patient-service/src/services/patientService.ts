/**
 * Patient Service
 * Business logic for patient management
 */

import { eq, and, or, like, desc, isNull } from 'drizzle-orm';
import db from '../config/database';
import {
  patients,
  patientAllergies,
  patientMedicalHistory,
  type Patient,
  type NewPatient,
  type PatientAllergy,
  type NewPatientAllergy,
  type PatientMedicalHistory,
  type NewPatientMedicalHistory
} from '../models/schema';

export class PatientService {
  /**
   * Create a new patient
   */
  async createPatient(data: NewPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(data).returning();
    return patient;
  }

  /**
   * Get patient by ID with related data
   */
  async getPatientById(id: string, tenantId: string) {
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, id),
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt)
      )
    });

    if (!patient) {
      return null;
    }

    // Get allergies
    const allergies = await db.query.patientAllergies.findMany({
      where: and(
        eq(patientAllergies.patientId, id),
        eq(patientAllergies.isActive, true)
      )
    });

    // Get medical history
    const medicalHistory = await db.query.patientMedicalHistory.findMany({
      where: eq(patientMedicalHistory.patientId, id),
      orderBy: [desc(patientMedicalHistory.diagnosisDate)]
    });

    return {
      ...patient,
      allergies,
      medicalHistory
    };
  }

  /**
   * Search patients
   */
  async searchPatients(
    filters: {
      tenantId: string;
      query?: string;
      nationalId?: string;
      phone?: string;
      dateOfBirth?: string;
    },
    pagination: { page: number; limit: number }
  ) {
    const conditions: any[] = [
      eq(patients.tenantId, filters.tenantId),
      isNull(patients.deletedAt)
    ];

    // Search by name or national ID
    if (filters.query) {
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          like(patients.firstName, searchTerm),
          like(patients.lastName, searchTerm),
          like(patients.nationalId, searchTerm)
        )
      );
    }

    if (filters.nationalId) {
      conditions.push(eq(patients.nationalId, filters.nationalId));
    }

    if (filters.phone) {
      conditions.push(
        or(
          eq(patients.phone, filters.phone),
          eq(patients.alternatePhone, filters.phone)
        )
      );
    }

    if (filters.dateOfBirth) {
      conditions.push(eq(patients.dateOfBirth, filters.dateOfBirth));
    }

    const offset = (pagination.page - 1) * pagination.limit;

    const [patientList, [{ count }]] = await Promise.all([
      db.select()
        .from(patients)
        .where(and(...conditions))
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(patients.createdAt)),
      db.select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(and(...conditions))
    ]);

    return {
      patients: patientList,
      total: Number(count),
      page: pagination.page,
      limit: pagination.limit
    };
  }

  /**
   * Update patient
   */
  async updatePatient(id: string, data: Partial<NewPatient>, tenantId: string) {
    const [updated] = await db.update(patients)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(
        eq(patients.id, id),
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt)
      ))
      .returning();

    return updated;
  }

  /**
   * Get patient allergies
   */
  async getPatientAllergies(patientId: string, tenantId: string) {
    // Verify patient belongs to tenant
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId)
      )
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await db.query.patientAllergies.findMany({
      where: and(
        eq(patientAllergies.patientId, patientId),
        eq(patientAllergies.isActive, true)
      ),
      orderBy: [desc(patientAllergies.severity)]
    });
  }

  /**
   * Add patient allergy
   */
  async addPatientAllergy(
    patientId: string,
    data: Omit<NewPatientAllergy, 'patientId'>,
    tenantId: string,
    verifiedBy: string
  ) {
    // Verify patient belongs to tenant
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId)
      )
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const [allergy] = await db.insert(patientAllergies)
      .values({
        ...data,
        patientId,
        verifiedBy,
        verifiedAt: new Date()
      })
      .returning();

    return allergy;
  }

  /**
   * Get patient medical history
   */
  async getPatientMedicalHistory(patientId: string, tenantId: string) {
    // Verify patient belongs to tenant
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId)
      )
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await db.query.patientMedicalHistory.findMany({
      where: eq(patientMedicalHistory.patientId, patientId),
      orderBy: [desc(patientMedicalHistory.diagnosisDate)]
    });
  }

  /**
   * Add medical history entry
   */
  async addMedicalHistoryEntry(
    patientId: string,
    data: Omit<NewPatientMedicalHistory, 'patientId'>,
    tenantId: string,
    diagnosedBy: string
  ) {
    // Verify patient belongs to tenant
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId)
      )
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const [entry] = await db.insert(patientMedicalHistory)
      .values({
        ...data,
        patientId,
        diagnosedBy
      })
      .returning();

    return entry;
  }

  /**
   * Soft delete patient
   */
  async deletePatient(id: string, tenantId: string) {
    const [deleted] = await db.update(patients)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(patients.id, id),
        eq(patients.tenantId, tenantId)
      ))
      .returning();

    return deleted;
  }
}

export const patientService = new PatientService();