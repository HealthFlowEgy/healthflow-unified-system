/**
 * Doctor Service
 */

import { eq, and, isNull } from 'drizzle-orm';
import db from '../config/database';
import {
  doctors,
  doctorStatistics,
  prescriptionTemplates,
  type Doctor,
  type NewDoctor
} from '../models/schema';

export class DoctorService {
  async createDoctor(data: NewDoctor): Promise<Doctor> {
    const [doctor] = await db.insert(doctors).values(data).returning();

    // Initialize statistics
    await db.insert(doctorStatistics).values({
      doctorId: doctor.id
    });

    return doctor;
  }

  async getDoctorByUserId(userId: string, tenantId: string) {
    const doctor = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.userId, userId),
        eq(doctors.tenantId, tenantId),
        isNull(doctors.deletedAt)
      )
    });

    if (!doctor) {
      return null;
    }

    // Get statistics
    const stats = await db.query.doctorStatistics.findFirst({
      where: eq(doctorStatistics.doctorId, doctor.id)
    });

    return {
      ...doctor,
      statistics: stats
    };
  }

  async updateDoctorByUserId(userId: string, data: Partial<NewDoctor>, tenantId: string) {
    const [updated] = await db.update(doctors)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(
        eq(doctors.userId, userId),
        eq(doctors.tenantId, tenantId),
        isNull(doctors.deletedAt)
      ))
      .returning();

    return updated;
  }

  async getDoctorStatistics(userId: string, tenantId: string) {
    const doctor = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.userId, userId),
        eq(doctors.tenantId, tenantId)
      )
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    return await db.query.doctorStatistics.findFirst({
      where: eq(doctorStatistics.doctorId, doctor.id)
    });
  }

  async getPrescriptionTemplates(userId: string, tenantId: string) {
    const doctor = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.userId, userId),
        eq(doctors.tenantId, tenantId)
      )
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    return await db.query.prescriptionTemplates.findMany({
      where: and(
        eq(prescriptionTemplates.doctorId, doctor.id),
        eq(prescriptionTemplates.isActive, true)
      )
    });
  }

  async createPrescriptionTemplate(userId: string, data: any, tenantId: string) {
    const doctor = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.userId, userId),
        eq(doctors.tenantId, tenantId)
      )
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const [template] = await db.insert(prescriptionTemplates)
      .values({
        doctorId: doctor.id,
        ...data
      })
      .returning();

    return template;
  }
}

export const doctorService = new DoctorService();