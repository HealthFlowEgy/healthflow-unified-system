/**
 * Push Notification Service
 * Handle APNs and FCM push notifications
 */

import { db } from '../config/database';
import { pushTokens, appEvents } from '../models/schema';
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

interface SendOptions {
  userId?: string;
  userIds?: string[];
  platform?: 'ios' | 'android' | 'all';
  topic?: string;
}

class PushNotificationService {
  private apnsClient: any; // APNs client
  private fcmClient: any; // FCM client

  constructor() {
    this.initializeAPNs();
    this.initializeFCM();
  }

  private initializeAPNs() {
    // Initialize APNs client
    // In production, use node-apn or similar library
    logger.info('APNs client initialized (mock)');
  }

  private initializeFCM() {
    // Initialize FCM client
    // In production, use firebase-admin
    logger.info('FCM client initialized (mock)');
  }

  async sendNotification(notification: PushNotification, options: SendOptions): Promise<{ success: number; failed: number }> {
    try {
      const tokens = await this.getDeviceTokens(options);
      
      if (tokens.length === 0) {
        logger.warn('No device tokens found for notification');
        return { success: 0, failed: 0 };
      }

      const results = await Promise.allSettled(
        tokens.map(token => this.sendToDevice(token, notification))
      );

      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Push notification sent: ${success} succeeded, ${failed} failed`);
      
      // Log event
      await this.logNotificationEvent(notification, options, { success, failed });

      return { success, failed };
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  private async getDeviceTokens(options: SendOptions): Promise<any[]> {
    try {
      let query = db.select().from(pushTokens);

      if (options.userId) {
        query = query.where(eq(pushTokens.userId, options.userId));
      } else if (options.userIds && options.userIds.length > 0) {
        // Filter by multiple user IDs
        query = query.where(
          and(
            ...options.userIds.map(id => eq(pushTokens.userId, id))
          )
        );
      }

      if (options.platform && options.platform !== 'all') {
        query = query.where(eq(pushTokens.platform, options.platform));
      }

      const tokens = await query;
      return tokens.filter(t => t.isActive);
    } catch (error) {
      logger.error('Failed to get device tokens:', error);
      return [];
    }
  }

  private async sendToDevice(token: any, notification: PushNotification): Promise<void> {
    try {
      if (token.platform === 'ios') {
        await this.sendAPNs(token.token, notification);
      } else if (token.platform === 'android') {
        await this.sendFCM(token.token, notification);
      }
    } catch (error) {
      logger.error(`Failed to send to device ${token.id}:`, error);
      
      // Mark token as inactive if it's invalid
      if (this.isInvalidTokenError(error)) {
        await db.update(pushTokens)
          .set({ isActive: false })
          .where(eq(pushTokens.id, token.id));
      }
      
      throw error;
    }
  }

  private async sendAPNs(token: string, notification: PushNotification): Promise<void> {
    // Mock APNs send
    // In production, use apnsClient.send()
    logger.info(`Sending APNs notification to ${token.substring(0, 10)}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendFCM(token: string, notification: PushNotification): Promise<void> {
    // Mock FCM send
    // In production, use fcmClient.send()
    logger.info(`Sending FCM notification to ${token.substring(0, 10)}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private isInvalidTokenError(error: any): boolean {
    // Check if error indicates invalid token
    return error?.code === 'InvalidToken' || error?.code === 'Unregistered';
  }

  private async logNotificationEvent(
    notification: PushNotification,
    options: SendOptions,
    results: { success: number; failed: number }
  ): Promise<void> {
    try {
      await db.insert(appEvents).values({
        eventType: 'push_notification_sent',
        eventCategory: 'notification',
        eventData: {
          notification,
          options,
          results
        },
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log notification event:', error);
    }
  }

  // Notification templates
  async sendAppointmentReminder(userId: string, appointmentData: any): Promise<void> {
    await this.sendNotification(
      {
        title: 'Appointment Reminder',
        body: `Your appointment with Dr. ${appointmentData.doctorName} is in ${appointmentData.timeUntil}`,
        data: {
          type: 'appointment_reminder',
          appointmentId: appointmentData.id
        },
        badge: 1,
        sound: 'default'
      },
      { userId, platform: 'all' }
    );
  }

  async sendPrescriptionReady(userId: string, prescriptionData: any): Promise<void> {
    await this.sendNotification(
      {
        title: 'Prescription Ready',
        body: `Your prescription #${prescriptionData.number} is ready for pickup`,
        data: {
          type: 'prescription_ready',
          prescriptionId: prescriptionData.id
        },
        badge: 1,
        sound: 'default'
      },
      { userId, platform: 'all' }
    );
  }

  async sendLabResultsReady(userId: string, labData: any): Promise<void> {
    await this.sendNotification(
      {
        title: 'Lab Results Available',
        body: 'Your lab results are now available',
        data: {
          type: 'lab_results_ready',
          labOrderId: labData.id
        },
        badge: 1,
        sound: 'default'
      },
      { userId, platform: 'all' }
    );
  }

  async sendChatMessage(userId: string, messageData: any): Promise<void> {
    await this.sendNotification(
      {
        title: `New message from ${messageData.senderName}`,
        body: messageData.preview,
        data: {
          type: 'chat_message',
          roomId: messageData.roomId,
          messageId: messageData.id
        },
        badge: 1,
        sound: 'default'
      },
      { userId, platform: 'all' }
    );
  }
}

export const pushNotificationService = new PushNotificationService();
