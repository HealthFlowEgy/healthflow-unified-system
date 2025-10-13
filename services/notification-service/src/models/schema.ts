/**
 * Notification Service Database Schema
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, json, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Recipient
  recipientId: uuid('recipient_id').notNull(),
  recipientType: varchar('recipient_type', { length: 50 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  recipientPhone: varchar('recipient_phone', { length: 20 }),
  
  // Notification Details
  notificationType: varchar('notification_type', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  message: text('message').notNull(),
  
  // Channels
  channel: varchar('channel', { length: 50 }).notNull(),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  
  // Delivery
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  
  // Metadata
  relatedEntityType: varchar('related_entity_type', { length: 100 }),
  relatedEntityId: uuid('related_entity_id'),
  metadata: json('metadata'),
  
  // Priority
  priority: varchar('priority', { length: 20 }).default('normal'),
  
  // Timestamps
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  recipientIdIdx: index('idx_notifications_recipient_id').on(table.recipientId),
  recipientTypeIdx: index('idx_notifications_recipient_type').on(table.recipientType),
  typeIdx: index('idx_notifications_type').on(table.notificationType),
  channelIdx: index('idx_notifications_channel').on(table.channel),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  tenantIdIdx: index('idx_notifications_tenant_id').on(table.tenantId)
}));

// ============================================================================
// NOTIFICATION TEMPLATES TABLE
// ============================================================================
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Template Details
  templateName: varchar('template_name', { length: 200 }).notNull().unique(),
  templateType: varchar('template_type', { length: 100 }).notNull(),
  description: text('description'),
  
  // Content
  subjectTemplate: varchar('subject_template', { length: 500 }).notNull(),
  messageTemplate: text('message_template').notNull(),
  
  // Channels
  supportedChannels: text('supported_channels').array().notNull(),
  
  // Variables
  templateVariables: json('template_variables'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  nameIdx: index('idx_notification_templates_name').on(table.templateName),
  typeIdx: index('idx_notification_templates_type').on(table.templateType)
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;

