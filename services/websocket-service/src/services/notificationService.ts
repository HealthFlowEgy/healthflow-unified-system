/**
 * Real-time Notification Service
 * Handle real-time event notifications via WebSocket
 */

import { db } from '../config/database';
import { realtimeEvents } from '../models/schema';
import { logger } from '../utils/logger';

interface NotificationData {
  eventType: string;
  eventCategory: string;
  userId?: string;
  socketId?: string;
  targetUserId?: string;
  targetRoom?: string;
  eventData: any;
  tenantId: string;
}

class NotificationService {
  async logEvent(data: NotificationData): Promise<string> {
    try {
      const [event] = await db.insert(realtimeEvents).values({
        eventType: data.eventType,
        eventCategory: data.eventCategory,
        userId: data.userId,
        socketId: data.socketId,
        targetUserId: data.targetUserId,
        targetRoom: data.targetRoom,
        eventData: data.eventData,
        status: 'sent',
        tenantId: data.tenantId
      }).returning();

      return event.id;
    } catch (error) {
      logger.error('Failed to log event:', error);
      throw error;
    }
  }

  async getRecentEvents(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const events = await db.select()
        .from(realtimeEvents)
        .where(eq(realtimeEvents.targetUserId, userId))
        .orderBy(desc(realtimeEvents.timestamp))
        .limit(limit);

      return events;
    } catch (error) {
      logger.error('Failed to get recent events:', error);
      return [];
    }
  }

  async markAsDelivered(eventId: string): Promise<void> {
    try {
      await db.update(realtimeEvents)
        .set({ status: 'delivered' })
        .where(eq(realtimeEvents.id, eventId));
    } catch (error) {
      logger.error('Failed to mark event as delivered:', error);
    }
  }
}

export const notificationService = new NotificationService();
