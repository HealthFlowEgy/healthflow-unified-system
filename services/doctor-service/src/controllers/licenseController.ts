/**
 * License Controller
 * Handles doctor license management
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { doctorLicenses } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class LicenseController {
  /**
   * Get all licenses for a doctor
   */
  async getLicenses(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      const licenses = await db
        .select()
        .from(doctorLicenses)
        .where(eq(doctorLicenses.doctorId, doctorId))
        .orderBy(desc(doctorLicenses.createdAt));

      logger.info(`Retrieved ${licenses.length} licenses for doctor ${doctorId}`);

      res.json({
        success: true,
        data: licenses,
        count: licenses.length
      });
    } catch (error) {
      logger.error('Error getting licenses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve licenses',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single license by ID
   */
  async getLicenseById(req: Request, res: Response) {
    try {
      const { doctorId, licenseId } = req.params;

      const [license] = await db
        .select()
        .from(doctorLicenses)
        .where(
          and(
            eq(doctorLicenses.id, licenseId),
            eq(doctorLicenses.doctorId, doctorId)
          )
        )
        .limit(1);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      res.json({
        success: true,
        data: license
      });
    } catch (error) {
      logger.error('Error getting license:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve license',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new license
   */
  async createLicense(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const licenseData = req.body;

      const [newLicense] = await db
        .insert(doctorLicenses)
        .values({
          doctorId,
          ...licenseData
        })
        .returning();

      logger.info(`Created new license ${newLicense.id} for doctor ${doctorId}`);

      res.status(201).json({
        success: true,
        message: 'License created successfully',
        data: newLicense
      });
    } catch (error) {
      logger.error('Error creating license:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create license',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a license
   */
  async updateLicense(req: Request, res: Response) {
    try {
      const { doctorId, licenseId } = req.params;
      const updateData = req.body;

      const [updatedLicense] = await db
        .update(doctorLicenses)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(doctorLicenses.id, licenseId),
            eq(doctorLicenses.doctorId, doctorId)
          )
        )
        .returning();

      if (!updatedLicense) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      logger.info(`Updated license ${licenseId} for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'License updated successfully',
        data: updatedLicense
      });
    } catch (error) {
      logger.error('Error updating license:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update license',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a license
   */
  async deleteLicense(req: Request, res: Response) {
    try {
      const { doctorId, licenseId } = req.params;

      const [deletedLicense] = await db
        .delete(doctorLicenses)
        .where(
          and(
            eq(doctorLicenses.id, licenseId),
            eq(doctorLicenses.doctorId, doctorId)
          )
        )
        .returning();

      if (!deletedLicense) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      logger.info(`Deleted license ${licenseId} for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'License deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting license:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete license',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify a license
   */
  async verifyLicense(req: Request, res: Response) {
    try {
      const { doctorId, licenseId } = req.params;
      const { verifiedBy } = req.body;

      const [verifiedLicense] = await db
        .update(doctorLicenses)
        .set({
          verifiedBy,
          verifiedAt: new Date(),
          status: 'active',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(doctorLicenses.id, licenseId),
            eq(doctorLicenses.doctorId, doctorId)
          )
        )
        .returning();

      if (!verifiedLicense) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      logger.info(`Verified license ${licenseId} for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'License verified successfully',
        data: verifiedLicense
      });
    } catch (error) {
      logger.error('Error verifying license:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify license',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active licenses for a doctor
   */
  async getActiveLicenses(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      const licenses = await db
        .select()
        .from(doctorLicenses)
        .where(
          and(
            eq(doctorLicenses.doctorId, doctorId),
            eq(doctorLicenses.status, 'active')
          )
        )
        .orderBy(desc(doctorLicenses.createdAt));

      res.json({
        success: true,
        data: licenses,
        count: licenses.length
      });
    } catch (error) {
      logger.error('Error getting active licenses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active licenses',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const licenseController = new LicenseController();

