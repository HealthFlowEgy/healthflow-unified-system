/**
 * Appointment Service Database Schema
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, json, index } from 'drizzle-orm/pg-core';

// ============================================================================
// APPOINTMENTS TABLE
// ============================================================================
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Appointment Number
  appointmentNumber: varchar('appointment_number', { length: 50 }).notNull().unique(),
  
  // Participants
  patientId: uuid('patient_id').notNull(),
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  doctorId: uuid('doctor_id').notNull(),
  doctorName: varchar('doctor_name', { length: 255 }).notNull(),
  
  // Appointment Details
  appointmentDate: timestamp('appointment_date').notNull(),
  duration: varchar('duration', { length: 20 }).notNull().default('30'),
  
  // Type
  appointmentType: varchar('appointment_type', { length: 50 }).notNull(),
  visitReason: text('visit_reason'),
  
  // Location
  location: varchar('location', { length: 200 }),
  roomNumber: varchar('room_number', { length: 50 }),
  isVirtual: boolean('is_virtual').default(false),
  virtualMeetingUrl: text('virtual_meeting_url'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
  
  // Cancellation
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: uuid('cancelled_by'),
  
  // Completion
  completedAt: timestamp('completed_at'),
  consultationNotes: text('consultation_notes'),
  diagnosis: text('diagnosis'),
  prescriptionCreated: boolean('prescription_created').default(false),
  prescriptionId: uuid('prescription_id'),
  
  // Notifications
  reminderSent: boolean('reminder_sent').default(false),
  reminderSentAt: timestamp('reminder_sent_at'),
  confirmationSent: boolean('confirmation_sent').default(false),
  confirmationSentAt: timestamp('confirmation_sent_at'),
  
  // Metadata
  tenantId: uuid('tenant_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  patientIdIdx: index('idx_appointments_patient_id').on(table.patientId),
  doctorIdIdx: index('idx_appointments_doctor_id').on(table.doctorId),
  dateIdx: index('idx_appointments_date').on(table.appointmentDate),
  statusIdx: index('idx_appointments_status').on(table.status),
  tenantIdIdx: index('idx_appointments_tenant_id').on(table.tenantId),
  numberIdx: index('idx_appointments_number').on(table.appointmentNumber)
}));

// ============================================================================
// APPOINTMENT HISTORY TABLE
// ============================================================================
export const appointmentHistory = pgTable('appointment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  
  action: varchar('action', { length: 100 }).notNull(),
  performedBy: uuid('performed_by').notNull(),
  performedByName: varchar('performed_by_name', { length: 255 }),
  
  previousData: json('previous_data'),
  newData: json('new_data'),
  notes: text('notes'),
  
  timestamp: timestamp('timestamp').notNull().defaultNow()
}, (table) => ({
  appointmentIdIdx: index('idx_appointment_history_appointment_id').on(table.appointmentId),
  timestampIdx: index('idx_appointment_history_timestamp').on(table.timestamp)
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type AppointmentHistory = typeof appointmentHistory.$inferSelect;
export type NewAppointmentHistory = typeof appointmentHistory.$inferInsert;

