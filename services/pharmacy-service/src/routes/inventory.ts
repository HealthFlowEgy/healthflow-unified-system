import { Router, Request, Response } from 'express';
import { db } from '../../../database/connection';
import { pharmacyInventory, pharmacies, medicines } from '../../../database/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// List inventory items
router.get('/', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const {
      pharmacyId,
      page = '1',
      limit = '50',
      lowStock,
      expiringSoon
    } = req.query;
    
    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHARMACY_ID',
          message: 'Pharmacy ID is required'
        }
      });
    }
    
    // Check pharmacy access
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, pharmacyId as string)
    });
    
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    if (req.user!.role === 'pharmacist' && pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this pharmacy'
        }
      });
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let conditions: any[] = [eq(pharmacyInventory.pharmacyId, pharmacyId as string)];
    
    // Filter low stock items
    if (lowStock === 'true') {
      conditions.push(sql`${pharmacyInventory.currentStock} <= ${pharmacyInventory.reorderLevel}`);
    }
    
    // Filter expiring soon (within 3 months)
    if (expiringSoon === 'true') {
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      conditions.push(lte(pharmacyInventory.expiryDate, threeMonthsFromNow));
    }
    
    const items = await db.query.pharmacyInventory.findMany({
      where: and(...conditions),
      with: {
        medicine: true
      },
      limit: limitNum,
      offset: offset,
      orderBy: (pharmacyInventory, { desc }) => [desc(pharmacyInventory.updatedAt)]
    });
    
    // Get total count
    const total = await db.query.pharmacyInventory.findMany({
      where: and(...conditions)
    });
    
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total.length,
          totalPages: Math.ceil(total.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to list inventory', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: 'Failed to retrieve inventory'
      }
    });
  }
});

// Get inventory item by ID
router.get('/:id', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await db.query.pharmacyInventory.findFirst({
      where: eq(pharmacyInventory.id, id),
      with: {
        medicine: true,
        pharmacy: true
      }
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }
    
    // Check access
    if (req.user!.role === 'pharmacist' && item.pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this inventory'
        }
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('Failed to get inventory item', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to retrieve inventory item'
      }
    });
  }
});

// Add inventory item
router.post('/', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const {
      pharmacyId,
      medicineId,
      batchNumber,
      currentStock,
      reorderLevel,
      unitPrice,
      expiryDate,
      supplier
    } = req.body;
    
    // Validate required fields
    if (!pharmacyId || !medicineId || !batchNumber || !currentStock || !unitPrice || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields'
        }
      });
    }
    
    // Check pharmacy access
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, pharmacyId)
    });
    
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PHARMACY_NOT_FOUND',
          message: 'Pharmacy not found'
        }
      });
    }
    
    if (req.user!.role === 'pharmacist' && pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this pharmacy'
        }
      });
    }
    
    // Check if medicine exists
    const medicine = await db.query.medicines.findFirst({
      where: eq(medicines.id, medicineId)
    });
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found'
        }
      });
    }
    
    // Create inventory item
    const [item] = await db.insert(pharmacyInventory).values({
      pharmacyId,
      medicineId,
      batchNumber,
      currentStock: parseInt(currentStock),
      reorderLevel: reorderLevel ? parseInt(reorderLevel) : 10,
      unitPrice: parseFloat(unitPrice),
      expiryDate: new Date(expiryDate),
      supplier
    }).returning();
    
    logger.info('Inventory item added', {
      itemId: item.id,
      pharmacyId,
      medicineId,
      userId: req.user!.userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully',
      data: item
    });
  } catch (error) {
    logger.error('Failed to add inventory item', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_FAILED',
        message: 'Failed to add inventory item'
      }
    });
  }
});

// Update inventory item
router.put('/:id', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get existing item
    const existing = await db.query.pharmacyInventory.findFirst({
      where: eq(pharmacyInventory.id, id),
      with: {
        pharmacy: true
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }
    
    // Check access
    if (req.user!.role === 'pharmacist' && existing.pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this inventory'
        }
      });
    }
    
    // Update item
    const [updated] = await db.update(pharmacyInventory)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(pharmacyInventory.id, id))
      .returning();
    
    logger.info('Inventory item updated', {
      itemId: id,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Failed to update inventory item', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update inventory item'
      }
    });
  }
});

// Adjust stock
router.patch('/:id/adjust-stock', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;
    
    if (adjustment === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ADJUSTMENT',
          message: 'Stock adjustment value is required'
        }
      });
    }
    
    // Get existing item
    const existing = await db.query.pharmacyInventory.findFirst({
      where: eq(pharmacyInventory.id, id),
      with: {
        pharmacy: true
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }
    
    // Check access
    if (req.user!.role === 'pharmacist' && existing.pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this inventory'
        }
      });
    }
    
    const newStock = existing.currentStock + parseInt(adjustment);
    
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for this adjustment'
        }
      });
    }
    
    // Update stock
    const [updated] = await db.update(pharmacyInventory)
      .set({
        currentStock: newStock,
        lastRestocked: adjustment > 0 ? new Date() : existing.lastRestocked,
        updatedAt: new Date()
      })
      .where(eq(pharmacyInventory.id, id))
      .returning();
    
    logger.info('Stock adjusted', {
      itemId: id,
      adjustment,
      reason,
      oldStock: existing.currentStock,
      newStock,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Failed to adjust stock', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADJUSTMENT_FAILED',
        message: 'Failed to adjust stock'
      }
    });
  }
});

// Delete inventory item
router.delete('/:id', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get existing item
    const existing = await db.query.pharmacyInventory.findFirst({
      where: eq(pharmacyInventory.id, id),
      with: {
        pharmacy: true
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }
    
    // Check access
    if (req.user!.role === 'pharmacist' && existing.pharmacy.ownerId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this inventory'
        }
      });
    }
    
    // Soft delete
    await db.update(pharmacyInventory)
      .set({ deletedAt: new Date() })
      .where(eq(pharmacyInventory.id, id));
    
    logger.warn('Inventory item deleted', {
      itemId: id,
      userId: req.user!.userId
    });
    
    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete inventory item', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete inventory item'
      }
    });
  }
});

export default router;

