import { Router, Request, Response } from 'express';
import { db } from '../../../database/connection';
import { dispensingRecords, pharmacyInventory, pharmacies } from '../../../database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Sales report
router.get('/sales', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { pharmacyId, startDate, endDate } = req.query;
    
    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHARMACY_ID',
          message: 'Pharmacy ID is required'
        }
      });
    }
    
    // Verify pharmacy access
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
    
    // Build date filter
    let conditions: any[] = [eq(dispensingRecords.pharmacyId, pharmacyId as string)];
    
    if (startDate) {
      conditions.push(gte(dispensingRecords.dispensedAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      conditions.push(lte(dispensingRecords.dispensedAt, new Date(endDate as string)));
    }
    
    // Get dispensing records
    const records = await db.query.dispensingRecords.findMany({
      where: and(...conditions),
      orderBy: (dispensingRecords, { desc }) => [desc(dispensingRecords.dispensedAt)]
    });
    
    // Calculate totals
    const totalSales = records.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
    const totalTransactions = records.length;
    
    // Group by payment method
    const byPaymentMethod = records.reduce((acc, record) => {
      const method = record.paymentMethod || 'unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count++;
      acc[method].amount += record.totalAmount || 0;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    // Group by date
    const byDate = records.reduce((acc, record) => {
      const date = record.dispensedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0 };
      }
      acc[date].count++;
      acc[date].amount += record.totalAmount || 0;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalTransactions,
          averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
        },
        byPaymentMethod,
        byDate,
        records
      }
    });
  } catch (error) {
    logger.error('Failed to generate sales report', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_FAILED',
        message: 'Failed to generate sales report'
      }
    });
  }
});

// Inventory report
router.get('/inventory', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { pharmacyId } = req.query;
    
    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHARMACY_ID',
          message: 'Pharmacy ID is required'
        }
      });
    }
    
    // Verify pharmacy access
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
    
    // Get all inventory items
    const items = await db.query.pharmacyInventory.findMany({
      where: eq(pharmacyInventory.pharmacyId, pharmacyId as string),
      with: {
        medicine: true
      }
    });
    
    // Calculate statistics
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0);
    
    // Low stock items
    const lowStock = items.filter(item => item.currentStock <= item.reorderLevel);
    
    // Expiring soon (within 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const expiringSoon = items.filter(item => item.expiryDate && item.expiryDate <= threeMonthsFromNow);
    
    // Out of stock
    const outOfStock = items.filter(item => item.currentStock === 0);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalValue,
          lowStockCount: lowStock.length,
          expiringSoonCount: expiringSoon.length,
          outOfStockCount: outOfStock.length
        },
        lowStock,
        expiringSoon,
        outOfStock,
        allItems: items
      }
    });
  } catch (error) {
    logger.error('Failed to generate inventory report', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_FAILED',
        message: 'Failed to generate inventory report'
      }
    });
  }
});

// Dashboard statistics
router.get('/dashboard', authorize('pharmacist', 'admin'), async (req: Request, res: Response) => {
  try {
    const { pharmacyId } = req.query;
    
    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHARMACY_ID',
          message: 'Pharmacy ID is required'
        }
      });
    }
    
    // Verify pharmacy access
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
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's sales
    const todayRecords = await db.query.dispensingRecords.findMany({
      where: and(
        eq(dispensingRecords.pharmacyId, pharmacyId as string),
        gte(dispensingRecords.dispensedAt, today),
        lte(dispensingRecords.dispensedAt, tomorrow)
      )
    });
    
    const todaySales = todayRecords.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
    const todayTransactions = todayRecords.length;
    
    // This month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const monthRecords = await db.query.dispensingRecords.findMany({
      where: and(
        eq(dispensingRecords.pharmacyId, pharmacyId as string),
        gte(dispensingRecords.dispensedAt, monthStart),
        lte(dispensingRecords.dispensedAt, monthEnd)
      )
    });
    
    const monthSales = monthRecords.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
    const monthTransactions = monthRecords.length;
    
    // Inventory stats
    const inventoryItems = await db.query.pharmacyInventory.findMany({
      where: eq(pharmacyInventory.pharmacyId, pharmacyId as string)
    });
    
    const lowStock = inventoryItems.filter(item => item.currentStock <= item.reorderLevel).length;
    const outOfStock = inventoryItems.filter(item => item.currentStock === 0).length;
    
    res.json({
      success: true,
      data: {
        today: {
          sales: todaySales,
          transactions: todayTransactions
        },
        month: {
          sales: monthSales,
          transactions: monthTransactions
        },
        inventory: {
          totalItems: inventoryItems.length,
          lowStock,
          outOfStock
        }
      }
    });
  } catch (error) {
    logger.error('Failed to generate dashboard stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_FAILED',
        message: 'Failed to generate dashboard statistics'
      }
    });
  }
});

export default router;

