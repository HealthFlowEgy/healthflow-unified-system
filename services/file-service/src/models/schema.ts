/**
 * File Service Database Schema
 */

import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  storedFilename: varchar('stored_filename', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // prescription, medical_record, profile_photo, etc.
  entityType: varchar('entity_type', { length: 50 }), // patient, doctor, prescription, appointment
  entityId: uuid('entity_id'),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>(),
  isPublic: boolean('is_public').default(false),
  uploadedBy: uuid('uploaded_by').notNull(),
  uploadedByName: varchar('uploaded_by_name', { length: 255 }),
  tenantId: uuid('tenant_id'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

export const fileAccessLog = pgTable('file_access_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id),
  userId: uuid('user_id').notNull(),
  userName: varchar('user_name', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(), // view, download, delete, share
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const fileShares = pgTable('file_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id),
  sharedBy: uuid('shared_by').notNull(),
  sharedWith: uuid('shared_with'),
  sharedWithEmail: varchar('shared_with_email', { length: 255 }),
  accessLevel: varchar('access_level', { length: 20 }).notNull(), // view, download, edit
  expiresAt: timestamp('expires_at'),
  accessToken: varchar('access_token', { length: 255 }),
  accessCount: integer('access_count').default(0),
  maxAccessCount: integer('max_access_count'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type FileAccessLog = typeof fileAccessLog.$inferSelect;
export type FileShare = typeof fileShares.$inferSelect;

