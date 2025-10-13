/**
 * Prescription Controller
 * Handles all prescription-related operations
 */

import { Request, Response } from 'express';
import { prescriptionService } from '../services/prescriptionService';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Validation schemas
const createPrescriptionSchema = z.object({
  doctor: z.object({
    id: z.string().uuid(),
    name: z.string(),
    license: z.string(),
    specialty: z.string().optional()
  }),
  patient: z.object({
    id: z.string().uuid(),
    name: z.string(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    nationalId: z.string().optional()
  }),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  medications: z.array(z.object({
    medicineId: z.string().uuid(),
    medicineName: z.string(),
    medicineGenericName: z.string().optional(),
    medicineStrength: z.string().optional(),
    medicineForm: z.string().optional(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    quantity: z.number().int().positive(),
    refills: z.number().int().min(0).default(0),
    instructions: z.string().optional(),
    warnings: z.string().optional(),
    substitutionAllowed: z.boolean().default(true)
  })).min(1, 'At least one medication is required')
});

export class PrescriptionController {
  /**
   * Create a new prescription
   */
  async createPrescription(req: Request, res: Response) {
    try {
      // Validate request body
      const validated = createPrescriptionSchema.parse(req.body);

      // Get user from auth middleware
      const user = (req as any).user;

      // Create prescription
      const prescription = await prescriptionService.createPrescription({
        ...validated,
        tenantId: user.tenantId,
        createdBy: user.id
      });

      logger.info(`Prescription created: ${prescription.id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: prescription
      });
    } catch (error: any) {
      logger.error('Failed to create prescription:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create prescription'
      });
    }
  }

  /**
   * Get prescription by ID
   */
  async getPrescription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const prescription = await prescriptionService.getPrescriptionById(id, user.tenantId);

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found'
        });
      }

      res.status(200).json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('Failed to get prescription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve prescription'
      });
    }
  }

  /**
   * Get prescriptions with filters
   */
  async getPrescriptions(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        patientId,
        doctorId,
        status,
        from,
        to,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        tenantId: user.tenantId,
        patientId: patientId as string,
        doctorId: doctorId as string,
        status: status as string,
        from: from as string,
        to: to as string
      };

      const result = await prescriptionService.getPrescriptions(
        filters,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.status(200).json({
        success: true,
        data: result.prescriptions,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get prescriptions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve prescriptions'
      });
    }
  }

  /**
   * Submit prescription for AI validation
   */
  async submitForValidation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await prescriptionService.submitForValidation(id, user.tenantId, user.id);

      logger.info(`Prescription submitted for validation: ${id}`, { userId: user.id });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Failed to submit prescription for validation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit for validation'
      });
    }
  }

  /**
   * Update prescription status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const user = (req as any).user;

      const prescription = await prescriptionService.updateStatus(
        id,
        status,
        user.tenantId,
        user.id,
        reason
      );

      logger.info(`Prescription status updated: ${id} -> ${status}`, { userId: user.id });

      res.status(200).json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('Failed to update prescription status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update status'
      });
    }
  }

  /**
   * Get prescription history
   */
  async getPrescriptionHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const history = await prescriptionService.getPrescriptionHistory(id, user.tenantId);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get prescription history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve history'
      });
    }
  }

  /**
   * Delete prescription (soft delete)
   */
  async deletePrescription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      await prescriptionService.deletePrescription(id, user.tenantId, user.id);

      logger.info(`Prescription deleted: ${id}`, { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Prescription deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete prescription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete prescription'
      });
    }
  }
}

export const prescriptionController = new PrescriptionController();