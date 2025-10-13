/**
 * Prescription Service Database Schema
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  integer,
  decimal,
  boolean,
  index
} from 'drizzle-orm/pg-core';

// Prescriptions Table
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionNumber: varchar('prescription_number', { length: 50 }).notNull().unique(),
  
  // Doctor Information
  doctorId: uuid('doctor_id').notNull(),
  doctorName: varchar('doctor_name', { length: 255 }).notNull(),
  doctorLicense: varchar('doctor_license', { length: 50 }).notNull(),
  doctorSpecialty: varchar('doctor_specialty', { length: 100 }),
  
  // Patient Information
  patientId: uuid('patient_id').notNull(),
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  patientAge: integer('patient_age'),
  patientGender: varchar('patient_gender', { length: 10 }),
  patientNationalId: varchar('patient_national_id', { length: 20 }),
  
  // Prescription Details
  diagnosis: text('diagnosis'),
  clinicalNotes: text('clinical_notes'),
  prescriptionDate: timestamp('prescription_date').notNull().defaultNow(),
  expiryDate: timestamp('expiry_date'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  // Status values: draft, submitted, validated, approved, rejected, dispensed, cancelled
  
  // AI Validation
  aiValidationStatus: varchar('ai_validation_status', { length: 50 }),
  aiValidationScore: decimal('ai_validation_score', { precision: 5, scale: 2 }),
  aiValidationResult: json('ai_validation_result'),
  
  // Approval
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  
  // Dispensing
  dispensedBy: uuid('dispensed_by'),
  dispensedAt: timestamp('dispensed_at'),
  pharmacyId: uuid('pharmacy_id'),
  
  // Metadata
  tenantId: uuid('tenant_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  patientIdIdx: index('idx_prescriptions_patient_id').on(table.patientId),
  doctorIdIdx: index('idx_prescriptions_doctor_id').on(table.doctorId),
  statusIdx: index('idx_prescriptions_status').on(table.status),
  prescriptionDateIdx: index('idx_prescriptions_date').on(table.prescriptionDate),
  tenantIdIdx: index('idx_prescriptions_tenant_id').on(table.tenantId)
}));

// Prescription Items (Medications) Table
export const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id),
  
  // Medication Details
  medicineId: uuid('medicine_id').notNull(),
  medicineName: varchar('medicine_name', { length: 255 }).notNull(),
  medicineGenericName: varchar('medicine_generic_name', { length: 255 }),
  medicineStrength: varchar('medicine_strength', { length: 100 }),
  medicineForm: varchar('medicine_form', { length: 50 }), // tablet, capsule, syrup, etc.
  
  // Dosage Instructions
  dosage: varchar('dosage', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  duration: varchar('duration', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull(),
  refills: integer('refills').default(0),
  
  // Instructions
  instructions: text('instructions'),
  warnings: text('warnings'),
  
  // Drug Interaction Check
  interactionWarnings: json('interaction_warnings'),
  safetyAlerts: json('safety_alerts'),
  
  // Substitution
  substitutionAllowed: boolean('substitution_allowed').default(true),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  prescriptionIdIdx: index('idx_prescription_items_prescription_id').on(table.prescriptionId),
  medicineIdIdx: index('idx_prescription_items_medicine_id').on(table.medicineId)
}));

// Prescription History/Audit Table
export const prescriptionHistory = pgTable('prescription_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id),
  
  action: varchar('action', { length: 100 }).notNull(), // created, updated, validated, approved, rejected, dispensed
  performedBy: uuid('performed_by').notNull(),
  performedByName: varchar('performed_by_name', { length: 255 }),
  performedByRole: varchar('performed_by_role', { length: 50 }),
  
  changes: json('changes'), // JSON of what changed
  notes: text('notes'),
  
  timestamp: timestamp('timestamp').notNull().defaultNow()
}, (table) => ({
  prescriptionIdIdx: index('idx_prescription_history_prescription_id').on(table.prescriptionId),
  timestampIdx: index('idx_prescription_history_timestamp').on(table.timestamp)
}));

// Type exports
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
export type PrescriptionHistoryRecord = typeof prescriptionHistory.$inferSelect;