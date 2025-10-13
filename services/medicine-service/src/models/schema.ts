/**
 * Medicine Service Database Schema
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  decimal,
  boolean,
  integer,
  index
} from 'drizzle-orm/pg-core';

// Medicines Table
export const medicines = pgTable('medicines', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Medicine Details
  tradeName: varchar('trade_name', { length: 255 }).notNull(),
  genericName: varchar('generic_name', { length: 255 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 255 }),
  
  // Classification
  category: varchar('category', { length: 100 }), // Antibiotic, Analgesic, etc.
  therapeuticClass: varchar('therapeutic_class', { length: 100 }),
  pharmacologicalClass: varchar('pharmacological_class', { length: 100 }),
  
  // Form & Strength
  dosageForm: varchar('dosage_form', { length: 50 }), // tablet, capsule, syrup
  strength: varchar('strength', { length: 100 }), // 500mg, 10mg/ml
  
  // Regulatory
  registrationNumber: varchar('registration_number', { length: 100 }),
  edaApproved: boolean('eda_approved').default(false),
  approvalDate: timestamp('approval_date'),
  
  // Prescription Requirements
  isPrescriptionRequired: boolean('is_prescription_required').default(true),
  isControlledSubstance: boolean('is_controlled_substance').default(false),
  schedule: varchar('schedule', { length: 20 }), // For controlled substances
  
  // Clinical Information
  indications: text('indications'),
  contraindications: text('contraindications'),
  sideEffects: text('side_effects'),
  interactions: json('interactions'), // Drug interactions
  warnings: text('warnings'),
  
  // Storage & Handling
  storageConditions: text('storage_conditions'),
  shelfLife: varchar('shelf_life', { length: 100 }),
  
  // Status
  isActive: boolean('is_active').default(true),
  discontinuedDate: timestamp('discontinued_date'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  tradeNameIdx: index('idx_medicines_trade_name').on(table.tradeName),
  genericNameIdx: index('idx_medicines_generic_name').on(table.genericName),
  categoryIdx: index('idx_medicines_category').on(table.category),
  registrationIdx: index('idx_medicines_registration').on(table.registrationNumber)
}));

// Drug Interactions Table
export const drugInteractions = pgTable('drug_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  medicineId1: uuid('medicine_id_1').notNull().references(() => medicines.id),
  medicineId2: uuid('medicine_id_2').notNull().references(() => medicines.id),
  
  interactionType: varchar('interaction_type', { length: 50 }).notNull(), // major, moderate, minor
  severity: varchar('severity', { length: 20 }).notNull(), // severe, moderate, mild
  
  description: text('description').notNull(),
  clinicalEffects: text('clinical_effects'),
  management: text('management'),
  
  evidenceLevel: varchar('evidence_level', { length: 20 }), // established, probable, possible
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  medicine1Idx: index('idx_drug_interactions_medicine1').on(table.medicineId1),
  medicine2Idx: index('idx_drug_interactions_medicine2').on(table.medicineId2)
}));

// Type exports
export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;
export type DrugInteraction = typeof drugInteractions.$inferSelect;