// Sprint 2 - Inventory Controller
// ------------------------------------------------------------------------------

import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class InventoryController {
  private service = new InventoryService();
  
  getInventory = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const {
        page = 1,
        limit = 50,
        status,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;
      
      // Verify pharmacy access
      const hasAccess = await this.service.checkPharmacyAccess(
        pharmacyId,
        req.user.userId
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this pharmacy'
          }
        });
      }
      
      const result = await this.service.getInventory(pharmacyId, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get inventory:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve inventory'
        }
      });
    }
  };
  
  addInventoryItem = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const itemData = req.body;
      
      const item = await this.service.addInventoryItem(pharmacyId, itemData);
      
      logger.info(`Inventory item added to pharmacy ${pharmacyId}`, {
        userId: req.user.userId,
        itemId: item.id,
        medicineId: itemData.medicineId
      });
      
      res.status(201).json({
        success: true,
        message: 'Inventory item added successfully',
        data: item
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to add inventory item:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ADD_ITEM_FAILED',
          message: 'Failed to add inventory item'
        }
      });
    }
  };
  
  updateInventoryItem = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, itemId } = req.params;
      const updates = req.body;
      
      const item = await this.service.updateInventoryItem(
        pharmacyId,
        itemId,
        updates
      );
      
      logger.info(`Inventory item updated: ${itemId}`, {
        userId: req.user.userId,
        pharmacyId,
        updates: Object.keys(updates)
      });
      
      res.json({
        success: true,
        message: 'Inventory item updated successfully',
        data: item
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to update inventory item:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ITEM_FAILED',
          message: 'Failed to update inventory item'
        }
      });
    }
  };
  
  deleteInventoryItem = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, itemId } = req.params;
      
      await this.service.deleteInventoryItem(pharmacyId, itemId);
      
      logger.info(`Inventory item deleted: ${itemId}`, {
        userId: req.user.userId,
        pharmacyId
      });
      
      res.json({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to delete inventory item:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ITEM_FAILED',
          message: 'Failed to delete inventory item'
        }
      });
    }
  };
  
  adjustStock = async (req: Request, res: Response) => {
    try {
      const { pharmacyId, itemId } = req.params;
      const { adjustment, reason } = req.body;
      
      const item = await this.service.adjustStock(
        pharmacyId,
        itemId,
        adjustment,
        reason,
        req.user.userId
      );
      
      logger.info(`Stock adjusted for item ${itemId}`, {
        userId: req.user.userId,
        pharmacyId,
        adjustment,
        reason
      });
      
      res.json({
        success: true,
        message: 'Stock adjusted successfully',
        data: item
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }
      
      logger.error('Failed to adjust stock:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STOCK_ADJUSTMENT_FAILED',
          message: 'Failed to adjust stock'
        }
      });
    }
  };
  
  getLowStockItems = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      
      const items = await this.service.getLowStockItems(pharmacyId);
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      logger.error('Failed to get low stock items:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve low stock items'
        }
      });
    }
  };
  
  getExpiringItems = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { days = 30 } = req.query;
      
      const items = await this.service.getExpiringItems(
        pharmacyId,
        Number(days)
      );
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      logger.error('Failed to get expiring items:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve expiring items'
        }
      });
    }
  };
  
  bulkImport = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { items } = req.body;
      
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Items array is required'
          }
        });
      }
      
      const result = await this.service.bulkImport(pharmacyId, items);
      
      logger.info(`Bulk import completed for pharmacy ${pharmacyId}`, {
        userId: req.user.userId,
        itemCount: items.length,
        successCount: result.successCount,
        failureCount: result.failureCount
      });
      
      res.json({
        success: true,
        message: `Imported ${result.successCount} items successfully`,
        data: result
      });
    } catch (error) {
      logger.error('Failed to bulk import:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_IMPORT_FAILED',
          message: 'Failed to import items'
        }
      });
    }
  };
  
  bulkUpdate = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { updates } = req.body;
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA',
            message: 'Updates array is required'
          }
        });
      }
      
      const result = await this.service.bulkUpdate(pharmacyId, updates);
      
      logger.info(`Bulk update completed for pharmacy ${pharmacyId}`, {
        userId: req.user.userId,
        updateCount: updates.length,
        successCount: result.successCount,
        failureCount: result.failureCount
      });
      
      res.json({
        success: true,
        message: `Updated ${result.successCount} items successfully`,
        data: result
      });
    } catch (error) {
      logger.error('Failed to bulk update:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_UPDATE_FAILED',
          message: 'Failed to update items'
        }
      });
    }
  };
  
  getInventoryValuation = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      
      const valuation = await this.service.getInventoryValuation(pharmacyId);
      
      res.json({
        success: true,
        data: valuation
      });
    } catch (error) {
      logger.error('Failed to get inventory valuation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALUATION_FAILED',
          message: 'Failed to calculate inventory valuation'
        }
      });
    }
  };
  
  getInventoryTurnover = async (req: Request, res: Response) => {
    try {
      const { pharmacyId } = req.params;
      const { startDate, endDate } = req.query;
      
      const turnover = await this.service.getInventoryTurnover(pharmacyId, {
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json({
        success: true,
        data: turnover
      });
    } catch (error) {
      logger.error('Failed to get inventory turnover:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TURNOVER_FAILED',
          message: 'Failed to calculate inventory turnover'
        }
      });
    }
  };
}

// ------------------------------------------------------------------------------