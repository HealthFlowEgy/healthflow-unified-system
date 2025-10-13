import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';

const router = Router();

router.get('/metrics', analyticsController.getMetrics.bind(analyticsController));
router.get('/trends/appointments', analyticsController.getAppointmentTrends.bind(analyticsController));
router.get('/top-doctors', analyticsController.getTopDoctors.bind(analyticsController));

export default router;
