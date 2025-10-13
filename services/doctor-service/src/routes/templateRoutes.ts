/**
 * Template Routes
 */

import { Router } from 'express';
import { templateController } from '../controllers/templateController';

const router = Router();

// Get all templates for a doctor
router.get('/:doctorId/templates', templateController.getTemplates.bind(templateController));

// Get most used templates
router.get('/:doctorId/templates/most-used', templateController.getMostUsedTemplates.bind(templateController));

// Get a specific template
router.get('/:doctorId/templates/:templateId', templateController.getTemplateById.bind(templateController));

// Create a new template
router.post('/:doctorId/templates', templateController.createTemplate.bind(templateController));

// Update a template
router.put('/:doctorId/templates/:templateId', templateController.updateTemplate.bind(templateController));

// Delete a template
router.delete('/:doctorId/templates/:templateId', templateController.deleteTemplate.bind(templateController));

// Use a template (increment usage count)
router.post('/:doctorId/templates/:templateId/use', templateController.useTemplate.bind(templateController));

// Toggle template status
router.patch('/:doctorId/templates/:templateId/toggle', templateController.toggleTemplateStatus.bind(templateController));

export default router;

