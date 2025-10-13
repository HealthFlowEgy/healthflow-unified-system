/**
 * Appointment Controller
 * Handles appointment CRUD operations
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { appointments, appointmentHistory } from '../models/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class AppointmentController {
  /**
   * Get all appointments with filters
   */
  async getAppointments(req: Request, res: Response) {
    try {
      const { patientId, doctorId, status, startDate, endDate, limit = '50' } = req.query;

      let query = db.select().from(appointments);

      // Apply filters
      const conditions = [];
      if (patientId) conditions.push(eq(appointments.patientId, patientId as string));
      if (doctorId) conditions.push(eq(appointments.doctorId, doctorId as string));
      if (status) conditions.push(eq(appointments.status, status as string));
      if (startDate) conditions.push(gte(appointments.appointmentDate, new Date(startDate as string)));
      if (endDate) conditions.push(lte(appointments.appointmentDate, new Date(endDate as string)));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query
        .orderBy(desc(appointments.appointmentDate))
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error('Error getting appointments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Error getting appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(req: Request, res: Response) {
    try {
      const appointmentData = req.body;

      // Generate appointment number
      const appointmentNumber = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const [newAppointment] = await db
        .insert(appointments)
        .values({
          ...appointmentData,
          appointmentNumber,
          status: 'scheduled'
        })
        .returning();

      // Log history
      await db.insert(appointmentHistory).values({
        appointmentId: newAppointment.id,
        action: 'created',
        performedBy: appointmentData.createdBy,
        performedByName: appointmentData.patientName,
        newData: newAppointment,
        notes: 'Appointment created'
      });

      logger.info(`Created appointment ${newAppointment.id}`);

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: newAppointment
      });
    } catch (error) {
      logger.error('Error creating appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update an appointment
   */
  async updateAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get current appointment
      const [currentAppointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      // Log history
      await db.insert(appointmentHistory).values({
        appointmentId: id,
        action: 'updated',
        performedBy: updateData.updatedBy || currentAppointment.createdBy,
        previousData: currentAppointment,
        newData: updatedAppointment,
        notes: 'Appointment updated'
      });

      logger.info(`Updated appointment ${id}`);

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: updatedAppointment
      });
    } catch (error) {
      logger.error('Error updating appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { cancellationReason, cancelledBy } = req.body;

      const [currentAppointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);

      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      const [cancelledAppointment] = await db
        .update(appointments)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason,
          cancelledBy,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      // Log history
      await db.insert(appointmentHistory).values({
        appointmentId: id,
        action: 'cancelled',
        performedBy: cancelledBy,
        previousData: currentAppointment,
        newData: cancelledAppointment,
        notes: `Cancelled: ${cancellationReason}`
      });

      logger.info(`Cancelled appointment ${id}`);

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: cancelledAppointment
      });
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Complete an appointment
   */
  async completeAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { consultationNotes, diagnosis, prescriptionId } = req.body;

      const [completedAppointment] = await db
        .update(appointments)
        .set({
          status: 'completed',
          completedAt: new Date(),
          consultationNotes,
          diagnosis,
          prescriptionId,
          prescriptionCreated: !!prescriptionId,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      if (!completedAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Log history
      await db.insert(appointmentHistory).values({
        appointmentId: id,
        action: 'completed',
        performedBy: completedAppointment.doctorId,
        performedByName: completedAppointment.doctorName,
        newData: completedAppointment,
        notes: 'Appointment completed'
      });

      logger.info(`Completed appointment ${id}`);

      res.json({
        success: true,
        message: 'Appointment completed successfully',
        data: completedAppointment
      });
    } catch (error) {
      logger.error('Error completing appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(req: Request, res: Response) {
    try {
      const { patientId, doctorId, limit = '10' } = req.query;

      const conditions = [
        gte(appointments.appointmentDate, new Date()),
        eq(appointments.status, 'scheduled')
      ];

      if (patientId) conditions.push(eq(appointments.patientId, patientId as string));
      if (doctorId) conditions.push(eq(appointments.doctorId, doctorId as string));

      const results = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.appointmentDate))
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error('Error getting upcoming appointments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get appointment history
   */
  async getAppointmentHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const history = await db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, id))
        .orderBy(desc(appointmentHistory.timestamp));

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      logger.error('Error getting appointment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve appointment history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const appointmentController = new AppointmentController();

