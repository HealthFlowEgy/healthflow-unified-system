/**
 * Mobile API Database Schema
 */

import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// Push Notification Tokens
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Token Details
  token: text('token').notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  deviceType: varchar('device_type', { length: 50 }).notNull(), // phone, tablet
  
  // Platform
  platform: varchar('platform', { length: 20 }).notNull(), // ios, android
  platformVersion: varchar('platform_version', { length: 50 }),
  appVersion: varchar('app_version', { length: 50 }),
  
  // Status
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Tenant
  tenantId: uuid('tenant_id').notNull()
});

// Offline Sync Queue
export const syncQueue = pgTable('sync_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Sync Details
  entityType: varchar('entity_type', { length: 50 }).notNull(), // prescription, appointment, etc.
  entityId: uuid('entity_id'),
  action: varchar('action', { length: 20 }).notNull(), // create, update, delete
  
  // Data
  data: jsonb('data').notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, synced, failed
  syncedAt: timestamp('synced_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Priority
  priority: integer('priority').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Tenant
  tenantId: uuid('tenant_id').notNull()
});

// Mobile Sessions
export const mobileSessions = pgTable('mobile_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Session Details
  refreshToken: text('refresh_token').notNull().unique(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  
  // Device Info
  deviceName: varchar('device_name', { length: 255 }),
  platform: varchar('platform', { length: 20 }).notNull(),
  appVersion: varchar('app_version', { length: 50 }),
  
  // Network Info
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Status
  isActive: boolean('is_active').default(true),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Tenant
  tenantId: uuid('tenant_id').notNull()
});

// App Analytics Events
export const appEvents = pgTable('app_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  
  // Event Details
  eventName: varchar('event_name', { length: 100 }).notNull(),
  eventCategory: varchar('event_category', { length: 50 }).notNull(),
  
  // Device Info
  deviceId: varchar('device_id', { length: 255 }),
  platform: varchar('platform', { length: 20 }),
  appVersion: varchar('app_version', { length: 50 }),
  
  // Event Data
  properties: jsonb('properties'),
  
  // Context
  screenName: varchar('screen_name', { length: 100 }),
  sessionId: uuid('session_id'),
  
  // Timestamp
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Tenant
  tenantId: uuid('tenant_id').notNull()
});

