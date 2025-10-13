// Sprint 2 - Dispensing Validation Schemas
// ------------------------------------------------------------------------------

import { z } from 'zod';

export const verifyPrescriptionSchema = z.object({
  verificationMethod: z.enum(['prescription_number', 'patient_phone', 'patient_id']),
  verificationData: z.string().min(1)
});

export const dispensingSchema = z.object({
  prescriptionId: z.string().uuid(),
  medications: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    medicineId: z.string().uuid(),
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    batchNumber: z.string()
  })).min(1),
  paymentMethod: z.enum(['cash', 'card', 'insurance']),
  counselingNotes: z.string().optional(),
  patientVerified: z.boolean().default(true),
  verificationMethod: z.string().optional()
});

// ------------------------------------------------------------------------------