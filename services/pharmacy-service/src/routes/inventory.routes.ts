// Sprint 2 - Inventory Management Routes

import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  inventoryItemSchema, 
  inventoryUpdateSchema,
  stockAdjustmentSchema 
} from '../schemas/inventory.schemas';

const router = Router();
const controller = new InventoryController();

// Inventory CRUD
router.get(
  '/:pharmacyId',
  controller.getInventory
);

router.post(
  '/:pharmacyId/items',
  authorize(['pharmacist']),
  validateRequest(inventoryItemSchema),
  controller.addInventoryItem
);

router.put(
  '/:pharmacyId/items/:itemId',
  authorize(['pharmacist']),
  validateRequest(inventoryUpdateSchema),
  controller.updateInventoryItem
);

router.delete(
  '/:pharmacyId/items/:itemId',
  authorize(['pharmacist']),
  controller.deleteInventoryItem
);

// Stock Management
router.post(
  '/:pharmacyId/items/:itemId/adjust',
  authorize(['pharmacist']),
  validateRequest(stockAdjustmentSchema),
  controller.adjustStock
);

router.get(
  '/:pharmacyId/low-stock',
  controller.getLowStockItems
);

router.get(
  '/:pharmacyId/expiring',
  controller.getExpiringItems
);

// Batch Operations
router.post(
  '/:pharmacyId/bulk-import',
  authorize(['pharmacist']),
  controller.bulkImport
);

router.post(
  '/:pharmacyId/bulk-update',
  authorize(['pharmacist']),
  controller.bulkUpdate
);

// Reports
router.get(
  '/:pharmacyId/valuation',
  controller.getInventoryValuation
);

router.get(
  '/:pharmacyId/turnover',
  controller.getInventoryTurnover
);

export default router;

// ------------------------------------------------------------------------------