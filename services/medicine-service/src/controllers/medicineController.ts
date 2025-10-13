/**
 * Medicine Controller
 */

import { Request, Response } from 'express';
import { medicineService } from '../services/medicineService';
import { logger } from '../utils/logger';

export class MedicineController {
  /**
   * Search medicines
   */
  async searchMedicines(req: Request, res: Response) {
    try {
      const { query, category, prescriptionRequired, page = 1, limit = 20 } = req.query;

      const filters = {
        query: query as string,
        category: category as string,
        prescriptionRequired: prescriptionRequired === 'true',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await medicineService.searchMedicines(filters);

      res.status(200).json({
        success: true,
        data: result.medicines,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      logger.error('Failed to search medicines:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search medicines'
      });
    }
  }

  /**
   * Get medicine by ID
   */
  async getMedicine(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const medicine = await medicineService.getMedicineById(id);

      if (!medicine) {
        return res.status(404).json({
          success: false,
          error: 'Medicine not found'
        });
      }

      res.status(200).json({
        success: true,
        data: medicine
      });
    } catch (error) {
      logger.error('Failed to get medicine:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve medicine'
      });
    }
  }

  /**
   * Check drug interactions
   */
  async checkInteractions(req: Request, res: Response) {
    try {
      const { medicineIds } = req.body;

      if (!Array.isArray(medicineIds) || medicineIds.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 medicine IDs required'
        });
      }

      const interactions = await medicineService.checkInteractions(medicineIds);

      res.status(200).json({
        success: true,
        data: {
          hasInteractions: interactions.length > 0,
          interactions
        }
      });
    } catch (error) {
      logger.error('Failed to check interactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check interactions'
      });
    }
  }

  /**
   * Get medicine categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await medicineService.getCategories();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Failed to get categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve categories'
      });
    }
  }
}

export const medicineController = new MedicineController();