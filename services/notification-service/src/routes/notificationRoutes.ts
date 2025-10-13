/**
 * Notification Routes
 */

import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';

const router = Router();

// Get all notifications (with filters)
router.get('/', notificationController.getNotifications.bind(notificationController));

// Get templates
router.get('/templates', notificationController.getTemplates.bind(notificationController));

// Get a specific notification
router.get('/:id', notificationController.getNotificationById.bind(notificationController));

// Create and send a notification
router.post('/', notificationController.createNotification.bind(notificationController));

// Send notification from template
router.post('/send-from-template', notificationController.sendFromTemplate.bind(notificationController));

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));

export default router;
