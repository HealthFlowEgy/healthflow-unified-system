/**
 * Presence Service
 * Handle user online/offline status
 */

import { db } from '../config/database';
import { userPresence } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  socketId?: string;
  platform?: string;
  deviceType?: string;
  tenantId: string;
}

class PresenceService {
  async setOnline(data: PresenceData): Promise<void> {
    try {
      const existing = await db.select()
        .from(userPresence)
        .where(eq(userPresence.userId, data.userId));

      if (existing.length > 0) {
        await db.update(userPresence)
          .set({
            status: 'online',
            socketId: data.socketId,
            platform: data.platform,
            deviceType: data.deviceType,
            lastSeen: new Date(),
            updatedAt: new Date()
          })
          .where(eq(userPresence.userId, data.userId));
      } else {
        await db.insert(userPresence).values({
          userId: data.userId,
          status: 'online',
          socketId: data.socketId,
          platform: data.platform,
          deviceType: data.deviceType,
          lastSeen: new Date(),
          tenantId: data.tenantId
        });
      }

      logger.info(`User ${data.userId} is now online`);
    } catch (error) {
      logger.error('Failed to set user online:', error);
      throw error;
    }
  }

  async setOffline(userId: string): Promise<void> {
    try {
      await db.update(userPresence)
        .set({
          status: 'offline',
          socketId: null,
          lastSeen: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userPresence.userId, userId));

      logger.info(`User ${userId} is now offline`);
    } catch (error) {
      logger.error('Failed to set user offline:', error);
      throw error;
    }
  }

  async updateStatus(userId: string, status: 'online' | 'away' | 'busy' | 'offline', statusMessage?: string): Promise<void> {
    try {
      await db.update(userPresence)
        .set({
          status,
          statusMessage,
          updatedAt: new Date()
        })
        .where(eq(userPresence.userId, userId));

      logger.info(`User ${userId} status updated to ${status}`);
    } catch (error) {
      logger.error('Failed to update user status:', error);
      throw error;
    }
  }

  async getPresence(userId: string): Promise<any> {
    try {
      const [presence] = await db.select()
        .from(userPresence)
        .where(eq(userPresence.userId, userId));

      return presence || { status: 'offline' };
    } catch (error) {
      logger.error('Failed to get user presence:', error);
      return { status: 'offline' };
    }
  }

  async getMultiplePresence(userIds: string[]): Promise<Map<string, any>> {
    try {
      const presences = await db.select()
        .from(userPresence)
        .where(
          and(
            ...userIds.map(id => eq(userPresence.userId, id))
          )
        );

      const presenceMap = new Map();
      presences.forEach(p => {
        presenceMap.set(p.userId, p);
      });

      // Add offline status for users not in database
      userIds.forEach(id => {
        if (!presenceMap.has(id)) {
          presenceMap.set(id, { userId: id, status: 'offline' });
        }
      });

      return presenceMap;
    } catch (error) {
      logger.error('Failed to get multiple presence:', error);
      return new Map();
    }
  }

  async cleanupStalePresence(timeoutMinutes: number = 5): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

      const result = await db.update(userPresence)
        .set({
          status: 'offline',
          socketId: null
        })
        .where(
          and(
            eq(userPresence.status, 'online'),
            lt(userPresence.lastSeen, cutoffTime)
          )
        );

      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} stale presence records`);
      }

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup stale presence:', error);
      return 0;
    }
  }
}

export const presenceService = new PresenceService();
