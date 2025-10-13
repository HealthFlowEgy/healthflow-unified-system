/**
 * Appointment Routes
 */

import { Router } from 'express';
import { appointmentController } from '../controllers/appointmentController';

const router = Router();

// Get all appointments (with filters)
router.get('/', appointmentController.getAppointments.bind(appointmentController));

// Get upcoming appointments
router.get('/upcoming', appointmentController.getUpcomingAppointments.bind(appointmentController));

// Get a specific appointment
router.get('/:id', appointmentController.getAppointmentById.bind(appointmentController));

// Get appointment history
router.get('/:id/history', appointmentController.getAppointmentHistory.bind(appointmentController));

// Create a new appointment
router.post('/', appointmentController.createAppointment.bind(appointmentController));

// Update an appointment
router.put('/:id', appointmentController.updateAppointment.bind(appointmentController));

// Cancel an appointment
router.post('/:id/cancel', appointmentController.cancelAppointment.bind(appointmentController));

// Complete an appointment
router.post('/:id/complete', appointmentController.completeAppointment.bind(appointmentController));

export default router;

