// Sprint 2 - Pharmacy Validation Schemas

import { z } from 'zod';

export const pharmacyRegistrationSchema = z.object({
  licenseNumber: z.string().min(5).max(100),
  pharmacyName: z.string().min(2).max(255),
  ownerName: z.string().min(2).max(255),
  address: z.string().min(10),
  city: z.string().min(2).max(100),
  governorate: z.string().min(2).max(100),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().email(),
  operatingHours: z.record(z.string()).optional(),
  is24Hours: z.boolean().optional(),
  posSystem: z.string().optional()
});

export const pharmacyUpdateSchema = z.object({
  pharmacyName: z.string().min(2).max(255).optional(),
  ownerName: z.string().min(2).max(255).optional(),
  address: z.string().min(10).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  email: z.string().email().optional(),
  operatingHours: z.record(z.string()).optional(),
  is24Hours: z.boolean().optional()
});

export const staffAssignmentSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'pharmacist', 'assistant']),
  licenseNumber: z.string().optional(),
  canDispense: z.boolean().default(false)
});

// ------------------------------------------------------------------------------