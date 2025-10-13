/**
 * Patient Controller
 * Handles all patient-related operations
 */

import { Request, Response } from 'express';
import { patientService } from '../services/patientService';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Validation schemas
const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  nationalId: z.string().max(20).optional(),
  passportNumber: z.string().max(50).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  gender: z.enum(['male', 'female', 'other']),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  alternatePhone: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  governorate: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelation: z.string().max(50).optional(),
  height: z.string().max(20).optional(),
  weight: z.string().max(20).optional(),
  insuranceProvider: z.string().max(200).optional(),
  insuranceNumber: z.string().max(100).optional(),
  insuranceExpiryDate: z.string().optional()
});

const updatePatientSchema = createPatientSchema.partial();

export class PatientController {
  /**
   * Create a new patient
   */
  async createPatient(req: Request, res: Response) {
    try {
      const validated = createPatientSchema.parse(req.body);
      const user = (req as any).user;

      const patient = await patientService.createPatient({
        ...validated,
        tenantId: user.tenantId,
        createdBy: user.id
      });

      logger.info(`Patient created: ${patient.id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: patient
      });
    } catch (error: any) {
      logger.error('Failed to create patient:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create patient'
      });
    }
  }

  /**
   * Get patient by ID
   */
  async getPatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const patient = await patientService.getPatientById(id, user.tenantId);

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      res.status(200).json({
        success: true,
        data: patient
      });
    } catch (error) {
      logger.error('Failed to get patient:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve patient'
      });
    }
  }

  /**
   * Search patients
   */
  async searchPatients(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        query,
        nationalId,
        phone,
        dateOfBirth,
        page = 1,
        limit = 20
      } = req.query;

      const result = await patientService.searchPatients(
        {
          tenantId: user.tenantId,
          query: query as string,
          nationalId: nationalId as string,
          phone: phone as string,
          dateOfBirth: dateOfBirth as string
        },
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.status(200).json({
        success: true,
        data: result.patients,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      logger.error('Failed to search patients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search patients'
      });
    }
  }

  /**
   * Update patient
   */
  async updatePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = updatePatientSchema.parse(req.body);
      const user = (req as any).user;

      const patient = await patientService.updatePatient(
        id,
        validated,
        user.tenantId
      );

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      logger.info(`Patient updated: ${id}`, { userId: user.id });

      res.status(200).json({
        success: true,
        data: patient
      });
    } catch (error: any) {
      logger.error('Failed to update patient:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update patient'
      });
    }
  }

  /**
   * Get patient allergies
   */
  async getPatientAllergies(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const allergies = await patientService.getPatientAllergies(id, user.tenantId);

      res.status(200).json({
        success: true,
        data: allergies
      });
    } catch (error) {
      logger.error('Failed to get patient allergies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve allergies'
      });
    }
  }

  /**
   * Add patient allergy
   */
  async addPatientAllergy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const allergySchema = z.object({
        allergen: z.string().min(1).max(200),
        allergyType: z.enum(['medication', 'food', 'environmental', 'other']),
        severity: z.enum(['mild', 'moderate', 'severe', 'life-threatening']),
        reaction: z.string().optional(),
        onsetDate: z.string().optional(),
        notes: z.string().optional()
      });

      const validated = allergySchema.parse(req.body);

      const allergy = await patientService.addPatientAllergy(id, validated, user.tenantId, user.id);

      logger.info(`Allergy added for patient: ${id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: allergy
      });
    } catch (error: any) {
      logger.error('Failed to add allergy:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to add allergy'
      });
    }
  }

  /**
   * Get patient medical history
   */
  async getPatientMedicalHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const history = await patientService.getPatientMedicalHistory(id, user.tenantId);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get medical history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve medical history'
      });
    }
  }

  /**
   * Add medical history entry
   */
  async addMedicalHistoryEntry(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const historySchema = z.object({
        conditionType: z.enum(['chronic_disease', 'surgery', 'injury', 'other']),
        condition: z.string().min(1).max(200),
        icdCode: z.string().max(20).optional(),
        diagnosisDate: z.string().optional(),
        resolvedDate: z.string().optional(),
        severity: z.enum(['mild', 'moderate', 'severe']).optional(),
        status: z.enum(['active', 'resolved', 'managed']).default('active'),
        notes: z.string().optional(),
        treatment: z.string().optional()
      });

      const validated = historySchema.parse(req.body);

      const entry = await patientService.addMedicalHistoryEntry(id, validated, user.tenantId, user.id);

      logger.info(`Medical history added for patient: ${id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: entry
      });
    } catch (error: any) {
      logger.error('Failed to add medical history:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to add medical history'
      });
    }
  }

  /**
   * Delete patient (soft delete)
   */
  async deletePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      await patientService.deletePatient(id, user.tenantId);

      logger.info(`Patient deleted: ${id}`, { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Patient deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete patient:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete patient'
      });
    }
  }
}

export const patientController = new PatientController();