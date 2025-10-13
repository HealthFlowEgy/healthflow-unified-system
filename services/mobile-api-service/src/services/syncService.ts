import { db } from '../config/database';
import { syncQueue } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

class SyncService {
  async getPendingSync(userId: string, tenantId: string) {
    return await db
      .select()
      .from(syncQueue)
      .where(
        and(
          eq(syncQueue.userId, userId),
          eq(syncQueue.status, 'pending'),
          eq(syncQueue.tenantId, tenantId)
        )
      )
      .orderBy(syncQueue.priority, syncQueue.createdAt);
  }

  async addToQueue(data: {
    userId: string;
    entityType: string;
    entityId?: string;
    action: string;
    data: any;
    priority?: number;
    tenantId: string;
  }) {
    const [created] = await db
      .insert(syncQueue)
      .values(data)
      .returning();

    logger.info(`Added ${data.entityType} to sync queue for user ${data.userId}`);
    return created;
  }

  async markSynced(id: string) {
    await db
      .update(syncQueue)
      .set({ status: 'synced', syncedAt: new Date() })
      .where(eq(syncQueue.id, id));
  }
}

export const syncService = new SyncService();
