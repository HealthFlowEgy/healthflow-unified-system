/**
 * BI Dashboard Service Database Schema
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const dashboards = pgTable('dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  organizationId: uuid('organization_id'),
  createdBy: uuid('created_by'),
  isPublic: boolean('is_public').default(false),
  layout: jsonb('layout').$type<Record<string, any>>(),
  filters: jsonb('filters').$type<Record<string, any>>(),
  refreshInterval: integer('refresh_interval').default(300),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const widgets = pgTable('widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  dashboardId: uuid('dashboard_id').references(() => dashboards.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  query: text('query').notNull(),
  config: jsonb('config').$type<Record<string, any>>(),
  position: jsonb('position').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(),
  query: text('query').notNull(),
  parameters: jsonb('parameters').$type<Record<string, any>>(),
  schedule: jsonb('schedule').$type<Record<string, any>>(),
  format: varchar('format', { length: 20 }).default('pdf'),
  recipients: jsonb('recipients').$type<string[]>(),
  organizationId: uuid('organization_id'),
  createdBy: uuid('created_by'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const reportExecutions = pgTable('report_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').references(() => reports.id),
  status: varchar('status', { length: 20 }).notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  fileUrl: varchar('file_url', { length: 500 }),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const metricsCache = pgTable('metrics_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricKey: varchar('metric_key', { length: 255 }).notNull().unique(),
  metricValue: jsonb('metric_value').notNull().$type<Record<string, any>>(),
  organizationId: uuid('organization_id'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export type Dashboard = typeof dashboards.$inferSelect;
export type Widget = typeof widgets.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportExecution = typeof reportExecutions.$inferSelect;
export type MetricsCache = typeof metricsCache.$inferSelect;

