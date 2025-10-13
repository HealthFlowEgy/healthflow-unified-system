/**
 * Offline Sync Service
 * Handle offline data synchronization
 */

import { db } from '../config/database';
import { syncQueue } from '../models/schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface SyncItem {
  id?: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  deviceId?: string;
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: any[];
}

class OfflineSyncService {
  async queueSync(item: SyncItem): Promise<string> {
    try {
      const [result] = await db.insert(syncQueue).values({
        userId: item.userId,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        data: item.data,
        deviceId: item.deviceId,
        status: 'pending',
        createdAt: item.timestamp || new Date()
      }).returning();

      logger.info(`Sync item queued: ${result.id}`);
      return result.id;
    } catch (error) {
      logger.error('Failed to queue sync item:', error);
      throw error;
    }
  }

  async processSyncQueue(userId: string, deviceId?: string): Promise<SyncResult> {
    try {
      // Get pending sync items
      let query = db.select()
        .from(syncQueue)
        .where(
          and(
            eq(syncQueue.userId, userId),
            eq(syncQueue.status, 'pending')
          )
        )
        .orderBy(syncQueue.createdAt);

      if (deviceId) {
        query = query.where(eq(syncQueue.deviceId, deviceId));
      }

      const items = await query;

      if (items.length === 0) {
        return { success: true, syncedItems: 0, failedItems: 0, conflicts: [] };
      }

      const results = await Promise.allSettled(
        items.map(item => this.processSyncItem(item))
      );

      const synced = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Detect conflicts
      const conflicts = await this.detectConflicts(items);

      logger.info(`Sync completed: ${synced} synced, ${failed} failed, ${conflicts.length} conflicts`);

      return {
        success: failed === 0,
        syncedItems: synced,
        failedItems: failed,
        conflicts
      };
    } catch (error) {
      logger.error('Failed to process sync queue:', error);
      throw error;
    }
  }

  private async processSyncItem(item: any): Promise<void> {
    try {
      // Process based on entity type and action
      switch (item.entityType) {
        case 'appointment':
          await this.syncAppointment(item);
          break;
        case 'prescription':
          await this.syncPrescription(item);
          break;
        case 'patient':
          await this.syncPatient(item);
          break;
        default:
          logger.warn(`Unknown entity type: ${item.entityType}`);
      }

      // Mark as synced
      await db.update(syncQueue)
        .set({ 
          status: 'synced',
          syncedAt: new Date()
        })
        .where(eq(syncQueue.id, item.id));

    } catch (error) {
      // Mark as failed
      await db.update(syncQueue)
        .set({ 
          status: 'failed',
          retryCount: item.retryCount + 1,
          lastError: error.message
        })
        .where(eq(syncQueue.id, item.id));

      throw error;
    }
  }

  private async syncAppointment(item: any): Promise<void> {
    // Sync appointment data
    logger.info(`Syncing appointment: ${item.entityId}`);
    // Implementation would interact with appointment service
  }

  private async syncPrescription(item: any): Promise<void> {
    // Sync prescription data
    logger.info(`Syncing prescription: ${item.entityId}`);
    // Implementation would interact with prescription service
  }

  private async syncPatient(item: any): Promise<void> {
    // Sync patient data
    logger.info(`Syncing patient: ${item.entityId}`);
    // Implementation would interact with patient service
  }

  private async detectConflicts(items: any[]): Promise<any[]> {
    const conflicts: any[] = [];

    for (const item of items) {
      // Check if entity was modified on server after offline change
      const serverVersion = await this.getServerVersion(item.entityType, item.entityId);
      
      if (serverVersion && serverVersion.updatedAt > item.createdAt) {
        conflicts.push({
          itemId: item.id,
          entityType: item.entityType,
          entityId: item.entityId,
          clientVersion: item.data,
          serverVersion: serverVersion.data,
          timestamp: item.createdAt
        });
      }
    }

    return conflicts;
  }

  private async getServerVersion(entityType: string, entityId: string): Promise<any> {
    // Get current server version of entity
    // Implementation would query appropriate service
    return null;
  }

  async getPendingSyncCount(userId: string): Promise<number> {
    try {
      const result = await db.select()
        .from(syncQueue)
        .where(
          and(
            eq(syncQueue.userId, userId),
            eq(syncQueue.status, 'pending')
          )
        );

      return result.length;
    } catch (error) {
      logger.error('Failed to get pending sync count:', error);
      return 0;
    }
  }

  async clearOldSyncItems(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.delete(syncQueue)
        .where(
          and(
            eq(syncQueue.status, 'synced'),
            lt(syncQueue.syncedAt, cutoffDate)
          )
        );

      logger.info(`Cleared ${result.rowCount} old sync items`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to clear old sync items:', error);
      return 0;
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
