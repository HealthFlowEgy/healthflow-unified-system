import { pgTable, uuid, varchar, timestamp, decimal, text, boolean, jsonb } from 'drizzle-orm/pg-core';

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // card, paypal, wallet
  provider: varchar('provider', { length: 50 }).notNull(), // stripe, paypal
  token: text('token').notNull(),
  last4: varchar('last4', { length: 4 }),
  brand: varchar('brand', { length: 50 }),
  expiryMonth: varchar('expiry_month', { length: 2 }),
  expiryYear: varchar('expiry_year', { length: 4 }),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  tenantId: uuid('tenant_id').notNull()
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('EGP').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // pending, completed, failed, refunded
  type: varchar('type', { length: 50 }).notNull(), // prescription, appointment, subscription
  provider: varchar('provider', { length: 50 }).notNull(),
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  tenantId: uuid('tenant_id').notNull()
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
