/**
 * Template Controller
 * Handles prescription template management
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { prescriptionTemplates } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class TemplateController {
  /**
   * Get all templates for a doctor
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const { active } = req.query;

      let query = db
        .select()
        .from(prescriptionTemplates)
        .where(eq(prescriptionTemplates.doctorId, doctorId));

      // Filter by active status if provided
      if (active !== undefined) {
        query = query.where(
          and(
            eq(prescriptionTemplates.doctorId, doctorId),
            eq(prescriptionTemplates.isActive, active === 'true')
          )
        );
      }

      const templates = await query.orderBy(desc(prescriptionTemplates.createdAt));

      logger.info(`Retrieved ${templates.length} templates for doctor ${doctorId}`);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(req: Request, res: Response) {
    try {
      const { doctorId, templateId } = req.params;

      const [template] = await db
        .select()
        .from(prescriptionTemplates)
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, doctorId)
          )
        )
        .limit(1);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error getting template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const { name, description, templateData, isActive } = req.body;

      // Validate template data
      if (!name || !templateData) {
        return res.status(400).json({
          success: false,
          message: 'Name and template data are required'
        });
      }

      const [newTemplate] = await db
        .insert(prescriptionTemplates)
        .values({
          doctorId,
          name,
          description,
          templateData,
          isActive: isActive !== undefined ? isActive : true,
          usageCount: '0'
        })
        .returning();

      logger.info(`Created new template ${newTemplate.id} for doctor ${doctorId}`);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: newTemplate
      });
    } catch (error) {
      logger.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(req: Request, res: Response) {
    try {
      const { doctorId, templateId } = req.params;
      const updateData = req.body;

      const [updatedTemplate] = await db
        .update(prescriptionTemplates)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, doctorId)
          )
        )
        .returning();

      if (!updatedTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      logger.info(`Updated template ${templateId} for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { doctorId, templateId } = req.params;

      const [deletedTemplate] = await db
        .delete(prescriptionTemplates)
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, doctorId)
          )
        )
        .returning();

      if (!deletedTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      logger.info(`Deleted template ${templateId} for doctor ${doctorId}`);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(req: Request, res: Response) {
    try {
      const { doctorId, templateId } = req.params;

      // Get current template
      const [template] = await db
        .select()
        .from(prescriptionTemplates)
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, doctorId)
          )
        )
        .limit(1);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Increment usage count
      const currentCount = parseInt(template.usageCount || '0');
      const [updatedTemplate] = await db
        .update(prescriptionTemplates)
        .set({
          usageCount: (currentCount + 1).toString(),
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(prescriptionTemplates.id, templateId))
        .returning();

      logger.info(`Template ${templateId} used by doctor ${doctorId}. Count: ${currentCount + 1}`);

      res.json({
        success: true,
        message: 'Template usage recorded',
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Error using template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record template usage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Toggle template active status
   */
  async toggleTemplateStatus(req: Request, res: Response) {
    try {
      const { doctorId, templateId } = req.params;

      // Get current template
      const [template] = await db
        .select()
        .from(prescriptionTemplates)
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, doctorId)
          )
        )
        .limit(1);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Toggle status
      const [updatedTemplate] = await db
        .update(prescriptionTemplates)
        .set({
          isActive: !template.isActive,
          updatedAt: new Date()
        })
        .where(eq(prescriptionTemplates.id, templateId))
        .returning();

      logger.info(`Toggled template ${templateId} status to ${!template.isActive}`);

      res.json({
        success: true,
        message: 'Template status updated',
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Error toggling template status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle template status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get most used templates
   */
  async getMostUsedTemplates(req: Request, res: Response) {
    try {
      const { doctorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const templates = await db
        .select()
        .from(prescriptionTemplates)
        .where(
          and(
            eq(prescriptionTemplates.doctorId, doctorId),
            eq(prescriptionTemplates.isActive, true)
          )
        )
        .orderBy(desc(prescriptionTemplates.usageCount))
        .limit(limit);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error getting most used templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve most used templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const templateController = new TemplateController();

