/**
 * Doctor Controller
 */

import { Request, Response } from 'express';
import { doctorService } from '../services/doctorService';
import { z } from 'zod';
import { logger } from '../utils/logger';

const createDoctorSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  title: z.string().max(50).optional(),
  specialization: z.string().min(1).max(200),
  subSpecialization: z.string().max(200).optional(),
  licenseNumber: z.string().min(1).max(100),
  licenseIssuingAuthority: z.string().max(200).optional(),
  licenseIssueDate: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  medicalDegree: z.string().max(100).optional(),
  medicalSchool: z.string().max(200).optional(),
  graduationYear: z.string().length(4).optional(),
  email: z.string().email(),
  phone: z.string().max(20),
  alternatePhone: z.string().max(20).optional(),
  clinicAddress: z.string().optional(),
  city: z.string().max(100).optional(),
  governorate: z.string().max(100).optional(),
  consultationFee: z.string().max(20).optional(),
  acceptsInsurance: z.boolean().default(false)
});

export class DoctorController {
  async createDoctor(req: Request, res: Response) {
    try {
      const validated = createDoctorSchema.parse(req.body);
      const user = (req as any).user;

      const doctor = await doctorService.createDoctor({
        ...validated,
        userId: user.id,
        tenantId: user.tenantId
      });

      logger.info(`Doctor profile created: ${doctor.id}`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: doctor
      });
    } catch (error: any) {
      logger.error('Failed to create doctor:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create doctor profile'
      });
    }
  }

  async getDoctorProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const doctor = await doctorService.getDoctorByUserId(user.id, user.tenantId);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: doctor
      });
    } catch (error) {
      logger.error('Failed to get doctor profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve doctor profile'
      });
    }
  }

  async updateDoctorProfile(req: Request, res: Response) {
    try {
      const validated = createDoctorSchema.partial().parse(req.body);
      const user = (req as any).user;

      const doctor = await doctorService.updateDoctorByUserId(user.id, validated, user.tenantId);

      logger.info(`Doctor profile updated`, { userId: user.id });

      res.status(200).json({
        success: true,
        data: doctor
      });
    } catch (error: any) {
      logger.error('Failed to update doctor profile:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update doctor profile'
      });
    }
  }

  async getDoctorStatistics(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const stats = await doctorService.getDoctorStatistics(user.id, user.tenantId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get doctor statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  }

  async getPrescriptionTemplates(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const templates = await doctorService.getPrescriptionTemplates(user.id, user.tenantId);

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Failed to get templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve templates'
      });
    }
  }

  async createPrescriptionTemplate(req: Request, res: Response) {
    try {
      const templateSchema = z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        templateData: z.any()
      });

      const validated = templateSchema.parse(req.body);
      const user = (req as any).user;

      const template = await doctorService.createPrescriptionTemplate(user.id, validated, user.tenantId);

      logger.info(`Prescription template created`, { userId: user.id });

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      logger.error('Failed to create template:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }
  }
}

export const doctorController = new DoctorController();