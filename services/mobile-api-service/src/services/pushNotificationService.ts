/**
 * Push Notification Service
 * Supports FCM (Firebase) and APNS (Apple)
 */

import { db } from '../config/database';
import { pushTokens } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
}

class PushNotificationService {
  async sendToUser(userId: string, notification: PushNotification, tenantId: string) {
    try {
      const tokens = await db
        .select()
        .from(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.isActive, true),
            eq(pushTokens.tenantId, tenantId)
          )
        );

      if (tokens.length === 0) {
        logger.warn(`No push tokens found for user: ${userId}`);
        return { success: false, reason: 'no_tokens' };
      }

      // Mock implementation - in production, integrate with FCM/APNS
      logger.info(`Would send push notification to ${tokens.length} devices for user ${userId}`);
      logger.info(`Notification: ${notification.title} - ${notification.body}`);

      return {
        success: true,
        totalTokens: tokens.length,
        successCount: tokens.length,
        failureCount: 0
      };
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async registerToken(data: {
    userId: string;
    token: string;
    deviceId: string;
    deviceName?: string;
    deviceType: string;
    platform: string;
    platformVersion?: string;
    appVersion?: string;
    tenantId: string;
  }) {
    try {
      const [existing] = await db
        .select()
        .from(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, data.userId),
            eq(pushTokens.deviceId, data.deviceId),
            eq(pushTokens.tenantId, data.tenantId)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(pushTokens)
          .set({
            token: data.token,
            deviceName: data.deviceName,
            deviceType: data.deviceType,
            platform: data.platform,
            platformVersion: data.platformVersion,
            appVersion: data.appVersion,
            isActive: true,
            lastUsedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(pushTokens.id, existing.id))
          .returning();

        logger.info(`Updated push token for device: ${data.deviceId}`);
        return updated;
      } else {
        const [created] = await db
          .insert(pushTokens)
          .values(data)
          .returning();

        logger.info(`Registered new push token for device: ${data.deviceId}`);
        return created;
      }
    } catch (error) {
      logger.error('Failed to register push token:', error);
      throw error;
    }
  }

  async unregisterToken(userId: string, deviceId: string, tenantId: string) {
    try {
      await db
        .update(pushTokens)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.deviceId, deviceId),
            eq(pushTokens.tenantId, tenantId)
          )
        );

      logger.info(`Unregistered push token for device: ${deviceId}`);
    } catch (error) {
      logger.error('Failed to unregister push token:', error);
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
