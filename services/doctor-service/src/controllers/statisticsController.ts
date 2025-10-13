/**
 * Statistics Controller
 * Handles doctor statistics and dashboard data
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { doctorStatistics } from '../models/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class StatisticsController {
  /**
   * Get statistics for a doctor
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      const [stats] = await db
        .select()
        .from(doctorStatistics)
        .where(eq(doctorStatistics.doctorId, doctorId))
        .limit(1);

      if (!stats) {
        // Create initial statistics if not found
        const [newStats] = await db
          .insert(doctorStatistics)
          .values({
            doctorId,
            totalPrescriptions: '0',
            totalPatients: '0',
            averagePrescriptionsPerDay: '0'
          })
          .returning();

        return res.json({
          success: true,
          data: newStats
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update statistics for a doctor
   */
  async updateStatistics(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const updateData = req.body;

      // Check if statistics exist
      const [existingStats] = await db
        .select()
        .from(doctorStatistics)
        .where(eq(doctorStatistics.doctorId, doctorId))
        .limit(1);

      let updatedStats;

      if (existingStats) {
        // Update existing statistics
        [updatedStats] = await db
          .update(doctorStatistics)
          .set({
            ...updateData,
            updatedAt: new Date()
          })
          .where(eq(doctorStatistics.doctorId, doctorId))
          .returning();
      } else {
        // Create new statistics
        [updatedStats] = await db
          .insert(doctorStatistics)
          .values({
            doctorId,
            ...updateData
          })
          .returning();
      }

      logger.info(`Updated statistics for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'Statistics updated successfully',
        data: updatedStats
      });
    } catch (error) {
      logger.error('Error updating statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Increment prescription count
   */
  async incrementPrescriptionCount(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      // Get current statistics
      const [stats] = await db
        .select()
        .from(doctorStatistics)
        .where(eq(doctorStatistics.doctorId, doctorId))
        .limit(1);

      if (!stats) {
        // Create initial statistics
        const [newStats] = await db
          .insert(doctorStatistics)
          .values({
            doctorId,
            totalPrescriptions: '1',
            totalPatients: '0',
            averagePrescriptionsPerDay: '0',
            lastPrescriptionAt: new Date()
          })
          .returning();

        return res.json({
          success: true,
          data: newStats
        });
      }

      // Increment count
      const currentCount = parseInt(stats.totalPrescriptions || '0');
      const [updatedStats] = await db
        .update(doctorStatistics)
        .set({
          totalPrescriptions: (currentCount + 1).toString(),
          lastPrescriptionAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(doctorStatistics.doctorId, doctorId))
        .returning();

      logger.info(`Incremented prescription count for doctor ${doctorId} to ${currentCount + 1}`);

      res.json({
        success: true,
        message: 'Prescription count updated',
        data: updatedStats
      });
    } catch (error) {
      logger.error('Error incrementing prescription count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update prescription count',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Increment patient count
   */
  async incrementPatientCount(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      // Get current statistics
      const [stats] = await db
        .select()
        .from(doctorStatistics)
        .where(eq(doctorStatistics.doctorId, doctorId))
        .limit(1);

      if (!stats) {
        // Create initial statistics
        const [newStats] = await db
          .insert(doctorStatistics)
          .values({
            doctorId,
            totalPrescriptions: '0',
            totalPatients: '1',
            averagePrescriptionsPerDay: '0'
          })
          .returning();

        return res.json({
          success: true,
          data: newStats
        });
      }

      // Increment count
      const currentCount = parseInt(stats.totalPatients || '0');
      const [updatedStats] = await db
        .update(doctorStatistics)
        .set({
          totalPatients: (currentCount + 1).toString(),
          updatedAt: new Date()
        })
        .where(eq(doctorStatistics.doctorId, doctorId))
        .returning();

      logger.info(`Incremented patient count for doctor ${doctorId} to ${currentCount + 1}`);

      res.json({
        success: true,
        message: 'Patient count updated',
        data: updatedStats
      });
    } catch (error) {
      logger.error('Error incrementing patient count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update patient count',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate and update average prescriptions per day
   */
  async updateAveragePrescriptionsPerDay(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      // Get current statistics
      const [stats] = await db
        .select()
        .from(doctorStatistics)
        .where(eq(doctorStatistics.doctorId, doctorId))
        .limit(1);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Statistics not found'
        });
      }

      // Calculate average (this is a simple calculation, can be enhanced)
      const totalPrescriptions = parseInt(stats.totalPrescriptions || '0');
      const daysSinceFirstPrescription = stats.lastPrescriptionAt
        ? Math.ceil((Date.now() - new Date(stats.lastPrescriptionAt).getTime()) / (1000 * 60 * 60 * 24))
        : 1;

      const average = daysSinceFirstPrescription > 0
        ? (totalPrescriptions / daysSinceFirstPrescription).toFixed(2)
        : '0';

      const [updatedStats] = await db
        .update(doctorStatistics)
        .set({
          averagePrescriptionsPerDay: average,
          updatedAt: new Date()
        })
        .where(eq(doctorStatistics.doctorId, doctorId))
        .returning();

      res.json({
        success: true,
        message: 'Average prescriptions per day updated',
        data: updatedStats
      });
    } catch (error) {
      logger.error('Error updating average prescriptions per day:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update average',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset statistics for a doctor
   */
  async resetStatistics(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;

      const [resetStats] = await db
        .update(doctorStatistics)
        .set({
          totalPrescriptions: '0',
          totalPatients: '0',
          averagePrescriptionsPerDay: '0',
          lastPrescriptionAt: null,
          updatedAt: new Date()
        })
        .where(eq(doctorStatistics.doctorId, doctorId))
        .returning();

      if (!resetStats) {
        return res.status(404).json({
          success: false,
          message: 'Statistics not found'
        });
      }

      logger.info(`Reset statistics for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'Statistics reset successfully',
        data: resetStats
      });
    } catch (error) {
      logger.error('Error resetting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const statisticsController = new StatisticsController();

