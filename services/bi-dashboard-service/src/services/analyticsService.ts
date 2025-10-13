import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class AnalyticsService {
  async getSystemMetrics(organizationId?: string) {
    try {
      const metrics = {
        totalPatients: await this.getTotalPatients(organizationId),
        totalDoctors: await this.getTotalDoctors(organizationId),
        totalAppointments: await this.getTotalAppointments(organizationId),
        totalPrescriptions: await this.getTotalPrescriptions(organizationId),
        appointmentsToday: await this.getAppointmentsToday(organizationId),
        revenueThisMonth: await this.getRevenueThisMonth(organizationId)
      };
      return metrics;
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  private async getTotalPatients(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COUNT(*) as count FROM patients 
      WHERE deleted_at IS NULL
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
    `);
    return result.count || 0;
  }

  private async getTotalDoctors(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COUNT(*) as count FROM doctors 
      WHERE deleted_at IS NULL
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
    `);
    return result.count || 0;
  }

  private async getTotalAppointments(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COUNT(*) as count FROM appointments
      ${organizationId ? sql`WHERE organization_id = ${organizationId}` : sql``}
    `);
    return result.count || 0;
  }

  private async getTotalPrescriptions(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COUNT(*) as count FROM prescriptions
      ${organizationId ? sql`WHERE organization_id = ${organizationId}` : sql``}
    `);
    return result.count || 0;
  }

  private async getAppointmentsToday(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COUNT(*) as count FROM appointments
      WHERE DATE(appointment_date) = CURRENT_DATE
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
    `);
    return result.count || 0;
  }

  private async getRevenueThisMonth(organizationId?: string) {
    const [result] = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
    `);
    return result.total || 0;
  }

  async getAppointmentTrends(days: number = 30, organizationId?: string) {
    const results = await db.execute(sql`
      SELECT DATE(appointment_date) as date, COUNT(*) as count
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '${days} days'
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      GROUP BY DATE(appointment_date)
      ORDER BY date
    `);
    return results;
  }

  async getTopDoctors(limit: number = 10, organizationId?: string) {
    const results = await db.execute(sql`
      SELECT d.id, d.first_name, d.last_name, COUNT(a.id) as appointment_count
      FROM doctors d
      LEFT JOIN appointments a ON d.id = a.doctor_id
      WHERE d.deleted_at IS NULL
      ${organizationId ? sql`AND d.organization_id = ${organizationId}` : sql``}
      GROUP BY d.id, d.first_name, d.last_name
      ORDER BY appointment_count DESC
      LIMIT ${limit}
    `);
    return results;
  }
}

export const analyticsService = new AnalyticsService();
