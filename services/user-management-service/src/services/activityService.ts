/**
 * Activity Tracking Service
 * Comprehensive user activity logging and monitoring
 */

import { db } from '../config/database';
import { userActivityLog } from '../models/schema';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface ActivityLogEntry {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
}

interface ActivityQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class ActivityService {
  /**
   * Log user activity
   */
  async logActivity(entry: ActivityLogEntry): Promise<any> {
    const activity = await db.insert(userActivityLog).values({
      id: uuidv4(),
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      tenantId: entry.tenantId,
      createdAt: new Date()
    }).returning();

    return activity[0];
  }

  /**
   * Get user activity log
   */
  async getUserActivity(query: ActivityQuery): Promise<any> {
    const conditions = [];

    if (query.userId) {
      conditions.push(eq(userActivityLog.userId, query.userId));
    }

    if (query.action) {
      conditions.push(eq(userActivityLog.action, query.action));
    }

    if (query.entityType) {
      conditions.push(eq(userActivityLog.entityType, query.entityType));
    }

    if (query.startDate) {
      conditions.push(gte(userActivityLog.createdAt, query.startDate));
    }

    if (query.endDate) {
      conditions.push(lte(userActivityLog.createdAt, query.endDate));
    }

    const activities = await db.query.userActivityLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(userActivityLog.createdAt)],
      limit: query.limit || 50,
      offset: query.offset || 0
    });

    const totalCount = await db
      .select({ count: count() })
      .from(userActivityLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      activities,
      total: totalCount[0]?.count || 0,
      limit: query.limit || 50,
      offset: query.offset || 0
    };
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await db.query.userActivityLog.findMany({
      where: and(
        eq(userActivityLog.userId, userId),
        gte(userActivityLog.createdAt, startDate)
      )
    });

    // Group by action
    const byAction: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    activities.forEach(activity => {
      // Count by action
      byAction[activity.action] = (byAction[activity.action] || 0) + 1;

      // Count by date
      const date = activity.createdAt.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    return {
      totalActivities: activities.length,
      byAction,
      byDate,
      period: {
        start: startDate,
        end: new Date(),
        days
      }
    };
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(userId: string, limit: number = 10): Promise<any[]> {
    return await db.query.userActivityLog.findMany({
      where: eq(userActivityLog.userId, userId),
      orderBy: [desc(userActivityLog.createdAt)],
      limit
    });
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db
      .delete(userActivityLog)
      .where(lte(userActivityLog.createdAt, cutoffDate));

    return deleted.rowCount || 0;
  }
}

export const activityService = new ActivityService();

