// Sprint 2 - Inventory Validation Schemas
// ------------------------------------------------------------------------------

import { z } from 'zod';

export const inventoryItemSchema = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  expiryDate: z.string().refine((date) => {
    const d = new Date(date);
    return d > new Date();
  }, { message: 'Expiry date must be in the future' }),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive(),
  minStockLevel: z.number().int().positive().default(10)
});

export const inventoryUpdateSchema = z.object({
  batchNumber: z.string().min(1).max(100).optional(),
  quantity: z.number().int().min(0).optional(),
  expiryDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  minStockLevel: z.number().int().positive().optional(),
  status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'expired']).optional()
});

export const stockAdjustmentSchema = z.object({
  adjustment: z.number().int(),
  reason: z.string().min(3).max(255)
});

// ------------------------------------------------------------------------------