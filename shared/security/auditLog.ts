/**
 * Audit Logging Service
 * HIPAA-compliant audit trail
 */

import { db } from '../database/connection';
import { auditLogs } from '../database/schema';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  EXPORT = 'EXPORT',
  PRINT = 'PRINT'
}

export enum AuditResource {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PRESCRIPTION = 'PRESCRIPTION',
  APPOINTMENT = 'APPOINTMENT',
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  PAYMENT = 'PAYMENT',
  USER = 'USER'
}

interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

class AuditLogService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        tenantId: entry.tenantId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      // Don't throw - audit logging should not break the application
    }
  }

  async getAuditTrail(resourceId: string, limit: number = 100): Promise<any[]> {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where({ resourceId })
        .orderBy({ timestamp: 'desc' })
        .limit(limit);
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  async getUserActivity(userId: string, days: number = 30): Promise<any[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await db
        .select()
        .from(auditLogs)
        .where({ userId })
        .where('timestamp', '>=', since)
        .orderBy({ timestamp: 'desc' });
    } catch (error) {
      console.error('Failed to get user activity:', error);
      return [];
    }
  }
}

export const auditLogService = new AuditLogService();
