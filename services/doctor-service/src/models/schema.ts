/**
 * Doctor Service Database Schema
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

// Doctors Table
export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),

  // User Reference
  userId: uuid('user_id').notNull().unique(), // Links to users table in auth service

  // Personal Information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),

  // Professional Information
  title: varchar('title', { length: 50 }), // Dr., Prof., etc.
  specialization: varchar('specialization', { length: 200 }).notNull(),
  subSpecialization: varchar('sub_specialization', { length: 200 }),

  // License Information
  licenseNumber: varchar('license_number', { length: 100 }).notNull().unique(),
  licenseIssuingAuthority: varchar('license_issuing_authority', { length: 200 }),
  licenseIssueDate: date('license_issue_date'),
  licenseExpiryDate: date('license_expiry_date'),
  licenseStatus: varchar('license_status', { length: 50 }).notNull().default('active'), // active, suspended, expired, revoked

  // Qualifications
  medicalDegree: varchar('medical_degree', { length: 100 }),
  medicalSchool: varchar('medical_school', { length: 200 }),
  graduationYear: varchar('graduation_year', { length: 4 }),
  additionalQualifications: json('additional_qualifications'), // Array of qualifications

  // Contact Information
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  alternatePhone: varchar('alternate_phone', { length: 20 }),

  // Practice Information
  hospitalAffiliations: json('hospital_affiliations'), // Array of hospitals
  clinicAddress: text('clinic_address'),
  city: varchar('city', { length: 100 }),
  governorate: varchar('governorate', { length: 100 }),

  // Professional IDs
  nationalDoctorId: varchar('national_doctor_id', { length: 50 }),
  taxId: varchar('tax_id', { length: 50 }),

  // Digital Signature
  signatureImageUrl: text('signature_image_url'),
  digitalSignatureKey: text('digital_signature_key'), // Encrypted

  // Profile
  profilePhotoUrl: text('profile_photo_url'),
  biography: text('biography'),
  languagesSpoken: json('languages_spoken'), // Array of languages

  // Consultation
  consultationFee: varchar('consultation_fee', { length: 20 }),
  acceptsInsurance: boolean('accepts_insurance').default(false),

  // Status
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by'),

  // Metadata
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  userIdIdx: index('idx_doctors_user_id').on(table.userId),
  licenseNumberIdx: index('idx_doctors_license_number').on(table.licenseNumber),
  specializationIdx: index('idx_doctors_specialization').on(table.specialization),
  tenantIdIdx: index('idx_doctors_tenant_id').on(table.tenantId)
}));

// Doctor Licenses Table (for tracking license history)
export const doctorLicenses = pgTable('doctor_licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),

  licenseNumber: varchar('license_number', { length: 100 }).notNull(),
  licenseType: varchar('license_type', { length: 100 }), // medical, specialization, etc.
  issuingAuthority: varchar('issuing_authority', { length: 200 }).notNull(),

  issueDate: date('issue_date').notNull(),
  expiryDate: date('expiry_date'),

  status: varchar('status', { length: 50 }).notNull().default('active'),

  documentUrl: text('document_url'),
  notes: text('notes'),

  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  doctorIdIdx: index('idx_doctor_licenses_doctor_id').on(table.doctorId),
  licenseNumberIdx: index('idx_doctor_licenses_license_number').on(table.licenseNumber)
}));

// Prescription Templates Table
export const prescriptionTemplates = pgTable('prescription_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),

  // Template data (medications, dosages, frequencies)
  templateData: json('template_data').notNull(),

  // Usage tracking
  usageCount: varchar('usage_count', { length: 10 }).default('0'),
  lastUsedAt: timestamp('last_used_at'),

  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  doctorIdIdx: index('idx_prescription_templates_doctor_id').on(table.doctorId)
}));

// Doctor Statistics Table (for dashboard)
export const doctorStatistics = pgTable('doctor_statistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().unique().references(() => doctors.id, { onDelete: 'cascade' }),

  totalPrescriptions: varchar('total_prescriptions', { length: 10 }).default('0'),
  totalPatients: varchar('total_patients', { length: 10 }).default('0'),
  averagePrescriptionsPerDay: varchar('average_prescriptions_per_day', { length: 10 }).default('0'),

  lastPrescriptionAt: timestamp('last_prescription_at'),

  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  doctorIdIdx: index('idx_doctor_statistics_doctor_id').on(table.doctorId)
}));

// Type exports
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type DoctorLicense = typeof doctorLicenses.$inferSelect;
export type NewDoctorLicense = typeof doctorLicenses.$inferInsert;
export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type NewPrescriptionTemplate = typeof prescriptionTemplates.$inferInsert;
export type DoctorStatistics = typeof doctorStatistics.$inferSelect;