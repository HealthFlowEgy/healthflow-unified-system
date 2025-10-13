/**
 * Notification Controller
 * Handles notification CRUD and sending operations
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { notifications, notificationTemplates } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';

export class NotificationController {
  /**
   * Get all notifications with filters
   */
  async getNotifications(req: Request, res: Response) {
    try {
      const { recipientId, recipientType, status, channel, limit = '50' } = req.query;

      let query = db.select().from(notifications);

      const conditions = [];
      if (recipientId) conditions.push(eq(notifications.recipientId, recipientId as string));
      if (recipientType) conditions.push(eq(notifications.recipientType, recipientType as string));
      if (status) conditions.push(eq(notifications.status, status as string));
      if (channel) conditions.push(eq(notifications.channel, channel as string));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query
        .orderBy(desc(notifications.createdAt))
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      logger.error('Error getting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create and send a notification
   */
  async createNotification(req: Request, res: Response) {
    try {
      const notificationData = req.body;

      // Create notification record
      const [newNotification] = await db
        .insert(notifications)
        .values({
          ...notificationData,
          status: 'pending'
        })
        .returning();

      // Send notification based on channel
      try {
        if (notificationData.channel === 'email' && notificationData.recipientEmail) {
          await emailService.sendEmail({
            to: notificationData.recipientEmail,
            subject: notificationData.subject,
            message: notificationData.message
          });

          await db
            .update(notifications)
            .set({
              status: 'sent',
              sentAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(notifications.id, newNotification.id));

        } else if (notificationData.channel === 'sms' && notificationData.recipientPhone) {
          await smsService.sendSMS({
            to: notificationData.recipientPhone,
            message: notificationData.message
          });

          await db
            .update(notifications)
            .set({
              status: 'sent',
              sentAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(notifications.id, newNotification.id));

        } else if (notificationData.channel === 'in_app') {
          // In-app notifications are just stored, not sent externally
          await db
            .update(notifications)
            .set({
              status: 'delivered',
              sentAt: new Date(),
              deliveredAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(notifications.id, newNotification.id));
        }

        logger.info(`Notification ${newNotification.id} sent via ${notificationData.channel}`);

      } catch (sendError) {
        logger.error('Failed to send notification:', sendError);
        
        await db
          .update(notifications)
          .set({
            status: 'failed',
            failedAt: new Date(),
            failureReason: sendError instanceof Error ? sendError.message : 'Unknown error',
            updatedAt: new Date()
          })
          .where(eq(notifications.id, newNotification.id));
      }

      // Fetch updated notification
      const [updatedNotification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, newNotification.id))
        .limit(1);

      res.status(201).json({
        success: true,
        message: 'Notification created',
        data: updatedNotification
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [updatedNotification] = await db
        .update(notifications)
        .set({
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(notifications.id, id))
        .returning();

      if (!updatedNotification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: updatedNotification
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get notification templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const { templateType, isActive } = req.query;

      let query = db.select().from(notificationTemplates);

      const conditions = [];
      if (templateType) conditions.push(eq(notificationTemplates.templateType, templateType as string));
      if (isActive !== undefined) conditions.push(eq(notificationTemplates.isActive, isActive === 'true'));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const templates = await query.orderBy(desc(notificationTemplates.createdAt));

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send notification from template
   */
  async sendFromTemplate(req: Request, res: Response) {
    try {
      const { templateName, recipientId, recipientType, recipientEmail, recipientPhone, channel, variables, tenantId } = req.body;

      // Get template
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateName, templateName))
        .limit(1);

      if (!template || !template.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or inactive'
        });
      }

      // Replace variables in template
      let subject = template.subjectTemplate;
      let message = template.messageTemplate;

      if (variables) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, variables[key]);
          message = message.replace(regex, variables[key]);
        });
      }

      // Create notification
      const notificationData = {
        recipientId,
        recipientType,
        recipientEmail,
        recipientPhone,
        notificationType: template.templateType,
        subject,
        message,
        channel,
        tenantId,
        metadata: { templateName, variables }
      };

      // Reuse create notification logic
      req.body = notificationData;
      return this.createNotification(req, res);

    } catch (error) {
      logger.error('Error sending from template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification from template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const notificationController = new NotificationController();

