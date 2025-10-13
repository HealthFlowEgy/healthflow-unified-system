
---

<artifact identifier="sprint1-database-schemas" type="application/vnd.ant.code" language="typescript" title="Complete Database Schema Definitions with Drizzle ORM">
// File: integration/database/schema/index.ts
// Sprint 1 - Complete Database Schema Definitions

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb,
  decimal,
  date,
  pgEnum,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// =============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'doctor',
  'pharmacist',
  'eda_officer',
  'admin',
  'super_admin'
]);

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
  'locked'
]);

export const prescriptionStatusEnum = pgEnum('prescription_status', [
  'pending',
  'validated',
  'dispensed',
  'completed',
  'cancelled',
  'rejected'
]);

export const medicineStatusEnum = pgEnum('medicine_status', [
  'active',
  'disabled',
  'recalled',
  'pending_approval'
]);

export const recallSeverityEnum = pgEnum('recall_severity', [
  'minor',
  'moderate',
  'major',
  'critical'
]);

export const recallStatusEnum = pgEnum('recall_status', [
  'initiated',
  'in_progress',
  'completed',
  'cancelled'
]);

export const adverseEventSeverityEnum = pgEnum('adverse_event_severity', [
  'mild',
  'moderate',
  'severe',
  'life_threatening'
]);

export const adverseEventOutcomeEnum = pgEnum('adverse_event_outcome', [
  'recovered',
  'recovering',
  'not_recovered',
  'death',
  'unknown'
]);

export const pharmacyStatusEnum = pgEnum('pharmacy_status', [
  'pending',
  'active',
  'suspended',
  'closed'
]);

// =============================================================================
// USERS & AUTHENTICATION
// =============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  
  // Multi-tenancy
  tenantId: uuid('tenant_id').references(() => tenants.id),
  
  // MFA
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: varchar('mfa_secret', { length: 255 }),
  
  // Security
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lastFailedLogin: timestamp('last_failed_login'),
  lastLogin: timestamp('last_login'),
  tokenVersion: integer('token_version').default(0),
  
  // Password Reset
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  
  // Email Verification
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  
  // Profile
  phoneNumber: varchar('phone_number', { length: 20 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  specialty: varchar('specialty', { length: 100 }),
  facilityName: varchar('facility_name', { length: 255 }),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.status),
  tenantIdx: index('users_tenant_idx').on(table.tenantId)
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
  userIdx: index('refresh_tokens_user_idx').on(table.userId)
}));

// =============================================================================
// TENANTS (Multi-tenancy)
// =============================================================================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(), // 'hospital', 'clinic', 'pharmacy_chain'
  
  // Contact
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  
  // Address
  address: text('address'),
  city: varchar('city', { length: 100 }),
  governorate: varchar('governorate', { length: 100 }),
  
  // Settings
  settings: jsonb('settings'),
  
  // Status
  status: varchar('status', { length: 20 }).default('active'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug)
}));

// =============================================================================
// MEDICINES
// =============================================================================

export const medicines = pgTable('medicines', {
  id: uuid('id').primaryKey().defaultRandom(),
  edaNumber: varchar('eda_number', { length: 50 }).notNull().unique(),
  tradeName: varchar('trade_name', { length: 255 }).notNull(),
  scientificName: varchar('scientific_name', { length: 255 }).notNull(),
  
  // Manufacturer
  manufacturer: varchar('manufacturer', { length: 255 }).notNull(),
  manufacturerCountry: varchar('manufacturer_country', { length: 100 }),
  
  // Classification
  dosageForm: varchar('dosage_form', { length: 50 }).notNull(),
  strength: varchar('strength', { length: 50 }).notNull(),
  therapeuticClass: varchar('therapeutic_class', { length: 100 }),
  atcCode: varchar('atc_code', { length: 20 }),
  
  // Composition
  activeIngredients: jsonb('active_ingredients'),
  excipients: text('excipients'),
  
  // Medical Information
  indications: text('indications'),
  contraindications: text('contraindications'),
  sideEffects: text('side_effects'),
  warnings: text('warnings'),
  interactions: text('interactions'),
  dosageInstructions: text('dosage_instructions'),
  
  // Storage
  storageConditions: text('storage_conditions'),
  shelfLife: varchar('shelf_life', { length: 50 }),
  
  // Regulatory
  status: medicineStatusEnum('status').notNull().default('active'),
  approvalDate: date('approval_date'),
  expiryDate: date('expiry_date'),
  
  // Prescription Requirements
  requiresPrescription: boolean('requires_prescription').default(true),
  controlledSubstance: boolean('controlled_substance').default(false),
  
  // Images & Documents
  imageUrl: varchar('image_url', { length: 500 }),
  leafletUrl: varchar('leaflet_url', { length: 500 }),
  
  // Search
  searchVector: text('search_vector'), // For full-text search
  
  // Legacy System References
  providerPortalId: integer('provider_portal_id'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  edaNumberIdx: uniqueIndex('medicines_eda_number_idx').on(table.edaNumber),
  tradeNameIdx: index('medicines_trade_name_idx').on(table.tradeName),
  scientificNameIdx: index('medicines_scientific_name_idx').on(table.scientificName),
  statusIdx: index('medicines_status_idx').on(table.status),
  therapeuticClassIdx: index('medicines_therapeutic_class_idx').on(table.therapeuticClass),
  manufacturerIdx: index('medicines_manufacturer_idx').on(table.manufacturer)
}));

// =============================================================================
// PRESCRIPTIONS
// =============================================================================

export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionNumber: varchar('prescription_number', { length: 50 }).notNull().unique(),
  
  // Doctor Information
  doctorId: uuid('doctor_id').notNull().references(() => users.id),
  doctorName: varchar('doctor_name', { length: 255 }),
  doctorLicense: varchar('doctor_license', { length: 100 }),
  facilityName: varchar('facility_name', { length: 255 }),
  
  // Patient Information
  patientName: varchar('patient_name', { length: 255 }).notNull(),
  patientAge: integer('patient_age'),
  patientGender: varchar('patient_gender', { length: 10 }),
  patientPhone: varchar('patient_phone', { length: 20 }),
  patientNationalId: varchar('patient_national_id', { length: 50 }),
  
  // Medical Information
  diagnosis: text('diagnosis'),
  medications: jsonb('medications').notNull(), // Array of medication objects
  notes: text('notes'),
  
  // Validation
  status: prescriptionStatusEnum('status').notNull().default('pending'),
  validationStatus: varchar('validation_status', { length: 50 }),
  validationResult: jsonb('validation_result'),
  validatedAt: timestamp('validated_at'),
  validatedBy: uuid('validated_by').references(() => users.id),
  
  // Drug Interactions
  hasInteractions: boolean('has_interactions').default(false),
  interactionDetails: jsonb('interaction_details'),
  
  // Pharmacy Information
  pharmacyId: uuid('pharmacy_id').references(() => pharmacies.id),
  dispensedAt: timestamp('dispensed_at'),
  dispensedBy: uuid('dispensed_by').references(() => users.id),
  
  // Images & Documents
  imageUrl: varchar('image_url', { length: 500 }),
  ocrText: text('ocr_text'),
  
  // Source System
  sourceSystem: varchar('source_system', { length: 50 }), // 'provider_portal', 'pharmacy_portal'
  legacyId: varchar('legacy_id', { length: 255 }),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  prescriptionNumberIdx: uniqueIndex('prescriptions_number_idx').on(table.prescriptionNumber),
  doctorIdx: index('prescriptions_doctor_idx').on(table.doctorId),
  statusIdx: index('prescriptions_status_idx').on(table.status),
  pharmacyIdx: index('prescriptions_pharmacy_idx').on(table.pharmacyId),
  createdAtIdx: index('prescriptions_created_at_idx').on(table.createdAt)
}));

// =============================================================================
// PHARMACIES
// =============================================================================

export const pharmacies = pgTable('pharmacies', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseNumber: varchar('license_number', { length: 100 }).notNull().unique(),
  pharmacyName: varchar('pharmacy_name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }),
  
  // Location
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  governorate: varchar('governorate', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  
  // Contact
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  
  // Operating Information
  operatingHours: jsonb('operating_hours'), // {monday: "9:00-21:00", ...}
  is24Hours: boolean('is_24_hours').default(false),
  
  // Status
  status: pharmacyStatusEnum('status').notNull().default('pending'),
  licenseExpiry: date('license_expiry'),
  edaVerified: boolean('eda_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  
  // Integration
  posSystem: varchar('pos_system', { length: 50 }),
  apiIntegrationEnabled: boolean('api_integration_enabled').default(false),
  
  // Multi-tenancy
  tenantId: uuid('tenant_id').references(() => tenants.id),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  licenseIdx: uniqueIndex('pharmacies_license_idx').on(table.licenseNumber),
  cityIdx: index('pharmacies_city_idx').on(table.city),
  statusIdx: index('pharmacies_status_idx').on(table.status),
  locationIdx: index('pharmacies_location_idx').on(table.latitude, table.longitude)
}));

export const pharmacyStaff = pgTable('pharmacy_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  pharmacyId: uuid('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'owner', 'pharmacist', 'assistant'
  licenseNumber: varchar('license_number', { length: 100 }),
  canDispense: boolean('can_dispense').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  pharmacyUserIdx: uniqueIndex('pharmacy_staff_pharmacy_user_idx').on(table.pharmacyId, table.userId),
  pharmacyIdx: index('pharmacy_staff_pharmacy_idx').on(table.pharmacyId),
  userIdx: index('pharmacy_staff_user_idx').on(table.userId)
}));

// =============================================================================
// INVENTORY
// =============================================================================

export const pharmacyInventory = pgTable('pharmacy_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  pharmacyId: uuid('pharmacy_id').notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
  medicineId: uuid('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  
  // Stock Information
  batchNumber: varchar('batch_number', { length: 100 }),
  quantity: integer('quantity').notNull().default(0),
  expiryDate: date('expiry_date').notNull(),
  
  // Pricing
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).default('in_stock'), // in_stock, low_stock, out_of_stock, expired
  
  // Alerts
  minStockLevel: integer('min_stock_level').default(10),
  alertSent: boolean('alert_sent').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  pharmacyMedicineIdx: index('pharmacy_inventory_pharmacy_medicine_idx').on(table.pharmacyId, table.medicineId),
  statusIdx: index('pharmacy_inventory_status_idx').on(table.status),
  expiryIdx: index('pharmacy_inventory_expiry_idx').on(table.expiryDate)
}));

// =============================================================================
// DISPENSING RECORDS
// =============================================================================

export const dispensingRecords = pgTable('dispensing_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id),
  pharmacyId: uuid('pharmacy_id').notNull().references(() => pharmacies.id),
  dispensedBy: uuid('dispensed_by').notNull().references(() => users.id),
  
  // Dispensing Details
  medicationsDispensed: jsonb('medications_dispensed').notNull(), // [{medicine_id, quantity, batch_number, price}]
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }), // cash, card, insurance
  
  // Patient Verification
  patientVerified: boolean('patient_verified').default(false),
  verificationMethod: varchar('verification_method', { length: 50 }), // id_card, prescription_number, phone
  
  // Counseling
  counselingProvided: boolean('counseling_provided').default(false),
  counselingNotes: text('counseling_notes'),
  
  // Status
  status: varchar('status', { length: 20 }).default('completed'), // completed, partial, cancelled
  
  // Timestamps
  dispensedAt: timestamp('dispensed_at').notNull().defaultNow()
}, (table) => ({
  prescriptionIdx: index('dispensing_records_prescription_idx').on(table.prescriptionId),
  pharmacyIdx: index('dispensing_records_pharmacy_idx').on(table.pharmacyId),
  dispensedAtIdx: index('dispensing_records_dispensed_at_idx').on(table.dispensedAt)
}));

// =============================================================================
// RECALLS
// =============================================================================

export const recalls = pgTable('recalls', {
  id: uuid('id').primaryKey().defaultRandom(),
  recallNumber: varchar('recall_number', { length: 50 }).notNull().unique(),
  medicineId: uuid('medicine_id').notNull().references(() => medicines.id),
  
  // Recall Information
  reason: text('reason').notNull(),
  severity: recallSeverityEnum('severity').notNull(),
  batchNumbers: jsonb('batch_numbers'), // Array of affected batch numbers
  
  // Affected Quantities
  affectedQuantity: integer('affected_quantity'),
  recoveredQuantity: integer('recovered_quantity').default(0),
  
  // Dates
  recallDate: date('recall_date').notNull(),
  effectiveDate: date('effective_date'),
  completionDate: date('completion_date'),
  
  // Status
  status: recallStatusEnum('status').notNull().default('initiated'),
  
  // Initiated By
  initiatedBy: uuid('initiated_by').references(() => users.id),
  
  // Action Required
  actionRequired: text('action_required'),
  contactInfo: text('contact_info'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  recallNumberIdx: uniqueIndex('recalls_recall_number_idx').on(table.recallNumber),
  medicineIdx: index('recalls_medicine_idx').on(table.medicineId),
  severityIdx: index('recalls_severity_idx').on(table.severity),
  statusIdx: index('recalls_status_idx').on(table.status)
}));

// =============================================================================
// ADVERSE EVENTS
// =============================================================================

export const adverseEvents = pgTable('adverse_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportNumber: varchar('report_number', { length: 50 }).notNull().unique(),
  medicineId: uuid('medicine_id').notNull().references(() => medicines.id),
  
  // Reporter Information
  reportedBy: uuid('reported_by').references(() => users.id),
  reporterType: varchar('reporter_type', { length: 50 }), // doctor, pharmacist, patient
  
  // Patient Information
  patientAge: integer('patient_age'),
  patientGender: varchar('patient_gender', { length: 10 }),
  patientWeight: decimal('patient_weight', { precision: 5, scale: 2 }),
  
  // Event Information
  symptoms: jsonb('symptoms'), // Array of symptoms
  severity: adverseEventSeverityEnum('severity').notNull(),
  outcome: adverseEventOutcomeEnum('outcome'),
  
  // Event Details
  eventDate: date('event_date').notNull(),
  description: text('description').notNull(),
  treatmentProvided: text('treatment_provided'),
  
  // Medical History
  medicalHistory: text('medical_history'),
  concomitantMedications: jsonb('concomitant_medications'),
  allergies: text('allergies'),
  
  // Hospitalization
  requiredHospitalization: boolean('required_hospitalization').default(false),
  hospitalizationDays: integer('hospitalization_days'),
  
  // Life Threatening
  lifeThreatening: boolean('life_threatening').default(false),
  
  // Follow-up
  followUpRequired: boolean('follow_up_required').default(false),
  followUpNotes: text('follow_up_notes'),
  
  // Images & Documents
  attachments: jsonb('attachments'),
  
  // Status
  status: varchar('status', { length: 20 }).default('submitted'), // submitted, under_review, closed
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  reportNumberIdx: uniqueIndex('adverse_events_report_number_idx').on(table.reportNumber),
  medicineIdx: index('adverse_events_medicine_idx').on(table.medicineId),
  severityIdx: index('adverse_events_severity_idx').on(table.severity),
  eventDateIdx: index('adverse_events_event_date_idx').on(table.eventDate)
}));

// =============================================================================
// AUDIT LOGS
// =============================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // User Information
  userId: uuid('user_id').references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }),
  
  // Action Details
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  
  // Changes
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  
  // Request Information
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Additional Details
  details: jsonb('details'),
  
  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
}));

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Notification Content
  type: varchar('type', { length: 50 }).notNull(), // recall_alert, prescription_update, inventory_alert
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  
  // Related Entity
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  
  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  
  // Priority
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  
  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  unreadIdx: index('notifications_unread_idx').on(table.userId, table.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt)
}));

// =============================================================================
// PRICE HISTORY
// =============================================================================

export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  medicineId: uuid('medicine_id').notNull().references(() => medicines.id, { onDelete: 'cascade' }),
  pharmacyId: uuid('pharmacy_id').references(() => pharmacies.id, { onDelete: 'cascade' }),
  
  // Price Information
  oldPrice: decimal('old_price', { precision: 10, scale: 2 }),
  newPrice: decimal('new_price', { precision: 10, scale: 2 }).notNull(),
  
  // Change Information
  changePercentage: decimal('change_percentage', { precision: 5, scale: 2 }),
  reason: varchar('reason', { length: 255 }),
  
  // Recorded By
  recordedBy: uuid('recorded_by').references(() => users.id),
  
  // Timestamp
  recordedAt: timestamp('recorded_at').notNull().defaultNow()
}, (table) => ({
  medicineIdx: index('price_history_medicine_idx').on(table.medicineId),
  pharmacyIdx: index('price_history_pharmacy_idx').on(table.pharmacyId),
  recordedAtIdx: index('price_history_recorded_at_idx').on(table.recordedAt)
}));

// =============================================================================
// LEGACY MAPPING (for data migration tracking)
// =============================================================================

export const legacyMapping = pgTable('legacy_mapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // prescription, medicine, user
  legacySystem: varchar('legacy_system', { length: 50 }).notNull(), // repo1, repo2
  legacyId: varchar('legacy_id', { length: 255 }).notNull(),
  newId: uuid('new_id').notNull(),
  migratedAt: timestamp('migrated_at').notNull().defaultNow()
}, (table) => ({
  legacyIdx: uniqueIndex('legacy_mapping_legacy_idx').on(table.entityType, table.legacySystem, table.legacyId),
  newIdIdx: index('legacy_mapping_new_id_idx').on(table.newId)
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id]
  }),
  refreshTokens: many(refreshTokens),
  prescriptionsAsDo ctor: many(prescriptions, { relationName: 'doctor' }),
  prescriptionsAsValidator: many(prescriptions, { relationName: 'validator' }),
  prescriptionsAsDispenser: many(prescriptions, { relationName: 'dispenser' }),
  dispensingRecords: many(dispensingRecords),
  adverseEvents: many(adverseEvents),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  pharmacyStaff: many(pharmacyStaff)
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  pharmacies: many(pharmacies)
}));

export const medicinesRelations = relations(medicines, ({ many }) => ({
  prescriptions: many(prescriptions),
  pharmacyInventory: many(pharmacyInventory),
  recalls: many(recalls),
  adverseEvents: many(adverseEvents),
  priceHistory: many(priceHistory)
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  doctor: one(users, {
    fields: [prescriptions.doctorId],
    references: [users.id],
    relationName: 'doctor'
  }),
  validator: one(users, {
    fields: [prescriptions.validatedBy],
    references: [users.id],
    relationName: 'validator'
  }),
  dispenser: one(users, {
    fields: [prescriptions.dispensedBy],
    references: [users.id],
    relationName: 'dispenser'
  }),
  pharmacy: one(pharmacies, {
    fields: [prescriptions.pharmacyId],
    references: [pharmacies.id]
  }),
  dispensingRecords: many(dispensingRecords)
}));

export const pharmaciesRelations = relations(pharmacies, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [pharmacies.tenantId],
    references: [tenants.id]
  }),
  staff: many(pharmacyStaff),
  inventory: many(pharmacyInventory),
  prescriptions: many(prescriptions),
  dispensingRecords: many(dispensingRecords),
  priceHistory: many(priceHistory)
}));

export const pharmacyInventoryRelations = relations(pharmacyInventory, ({ one }) => ({
  pharmacy: one(pharmacies, {
    fields: [pharmacyInventory.pharmacyId],
    references: [pharmacies.id]
  }),
  medicine: one(medicines, {
    fields: [pharmacyInventory.medicineId],
    references: [medicines.id]
  })
}));

export const dispensingRecordsRelations = relations(dispensingRecords, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [dispensingRecords.prescriptionId],
    references: [prescriptions.id]
  }),
  pharmacy: one(pharmacies, {
    fields: [dispensingRecords.pharmacyId],
    references: [pharmacies.id]
  }),
  dispensedByUser: one(users, {
    fields: [dispensingRecords.dispensedBy],
    references: [users.id]
  })
}));

export const recallsRelations = relations(recalls, ({ one }) => ({
  medicine: one(medicines, {
    fields: [recalls.medicineId],
    references: [medicines.id]
  }),
  initiator: one(users, {
    fields: [recalls.initiatedBy],
    references: [users.id]
  })
}));

export const adverseEventsRelations = relations(adverseEvents, ({ one }) => ({
  medicine: one(medicines, {
    fields: [adverseEvents.medicineId],
    references: [medicines.id]
  }),
  reporter: one(users, {
    fields: [adverseEvents.reportedBy],
    references: [users.id]
  }),
  reviewer: one(users, {
    fields: [adverseEvents.reviewedBy],
    references: [users.id]
  })
}));

// =============================================================================
// EXPORTS
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

