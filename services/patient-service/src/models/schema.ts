/**
 * Patient Service Database Schema
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  json,
  boolean,
  index
} from 'drizzle-orm/pg-core';

// Patients Table
export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Personal Information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),

  // Identification
  nationalId: varchar('national_id', { length: 20 }).unique(),
  passportNumber: varchar('passport_number', { length: 50 }),

  // Demographics
  dateOfBirth: date('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(), // male, female, other
  bloodType: varchar('blood_type', { length: 5 }), // A+, A-, B+, B-, AB+, AB-, O+, O-

  // Contact Information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  alternatePhone: varchar('alternate_phone', { length: 20 }),

  // Address
  address: text('address'),
  city: varchar('city', { length: 100 }),
  governorate: varchar('governorate', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  country: varchar('country', { length: 100 }).default('Egypt'),

  // Emergency Contact
  emergencyContactName: varchar('emergency_contact_name', { length: 200 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  emergencyContactRelation: varchar('emergency_contact_relation', { length: 50 }),

  // Medical Information
  height: varchar('height', { length: 20 }), // e.g., "175 cm"
  weight: varchar('weight', { length: 20 }), // e.g., "70 kg"

  // Insurance
  insuranceProvider: varchar('insurance_provider', { length: 200 }),
  insuranceNumber: varchar('insurance_number', { length: 100 }),
  insuranceExpiryDate: date('insurance_expiry_date'),

  // Photos
  photoUrl: text('photo_url'),

  // Status
  isActive: boolean('is_active').default(true),
  isDeceased: boolean('is_deceased').default(false),
  deceasedDate: date('deceased_date'),

  // Metadata
  tenantId: uuid('tenant_id').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  nationalIdIdx: index('idx_patients_national_id').on(table.nationalId),
  nameIdx: index('idx_patients_name').on(table.firstName, table.lastName),
  phoneIdx: index('idx_patients_phone').on(table.phone),
  tenantIdIdx: index('idx_patients_tenant_id').on(table.tenantId),
  dobIdx: index('idx_patients_dob').on(table.dateOfBirth)
}));

// Patient Allergies Table
export const patientAllergies = pgTable('patient_allergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),

  allergen: varchar('allergen', { length: 200 }).notNull(),
  allergyType: varchar('allergy_type', { length: 50 }).notNull(), // medication, food, environmental, other
  severity: varchar('severity', { length: 20 }).notNull(), // mild, moderate, severe, life-threatening

  reaction: text('reaction'),
  onsetDate: date('onset_date'),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at'),

  notes: text('notes'),

  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  patientIdIdx: index('idx_patient_allergies_patient_id').on(table.patientId),
  allergenIdx: index('idx_patient_allergies_allergen').on(table.allergen)
}));

// Patient Medical History Table
export const patientMedicalHistory = pgTable('patient_medical_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),

  conditionType: varchar('condition_type', { length: 50 }).notNull(), // chronic_disease, surgery, injury, other
  condition: varchar('condition', { length: 200 }).notNull(),
  icdCode: varchar('icd_code', { length: 20 }), // ICD-10 code

  diagnosisDate: date('diagnosis_date'),
  resolvedDate: date('resolved_date'),

  severity: varchar('severity', { length: 20 }), // mild, moderate, severe
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, resolved, managed

  notes: text('notes'),
  treatment: text('treatment'),

  diagnosedBy: uuid('diagnosed_by'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  patientIdIdx: index('idx_patient_medical_history_patient_id').on(table.patientId),
  conditionIdx: index('idx_patient_medical_history_condition').on(table.condition),
  statusIdx: index('idx_patient_medical_history_status').on(table.status)
}));

// Patient Vital Signs Table (for comprehensive medical records)
export const patientVitalSigns = pgTable('patient_vital_signs', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),

  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  recordedBy: uuid('recorded_by').notNull(),

  // Vital Signs
  bloodPressureSystolic: varchar('blood_pressure_systolic', { length: 10 }),
  bloodPressureDiastolic: varchar('blood_pressure_diastolic', { length: 10 }),
  heartRate: varchar('heart_rate', { length: 10 }), // bpm
  temperature: varchar('temperature', { length: 10 }), // celsius
  respiratoryRate: varchar('respiratory_rate', { length: 10 }), // breaths per minute
  oxygenSaturation: varchar('oxygen_saturation', { length: 10 }), // percentage

  height: varchar('height', { length: 20 }),
  weight: varchar('weight', { length: 20 }),
  bmi: varchar('bmi', { length: 10 }),

  notes: text('notes'),

  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  patientIdIdx: index('idx_patient_vital_signs_patient_id').on(table.patientId),
  recordedAtIdx: index('idx_patient_vital_signs_recorded_at').on(table.recordedAt)
}));

// Type exports
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientAllergy = typeof patientAllergies.$inferSelect;
export type NewPatientAllergy = typeof patientAllergies.$inferInsert;
export type PatientMedicalHistory = typeof patientMedicalHistory.$inferSelect;
export type NewPatientMedicalHistory = typeof patientMedicalHistory.$inferInsert;
export type PatientVitalSigns = typeof patientVitalSigns.$inferSelect;
export type NewPatientVitalSigns = typeof patientVitalSigns.$inferInsert;