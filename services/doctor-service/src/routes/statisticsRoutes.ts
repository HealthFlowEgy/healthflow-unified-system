/**
 * Statistics Routes
 */

import { Router } from 'express';
import { statisticsController } from '../controllers/statisticsController';

const router = Router();

// Get statistics for a doctor
router.get('/:doctorId/statistics', statisticsController.getStatistics.bind(statisticsController));

// Update statistics
router.put('/:doctorId/statistics', statisticsController.updateStatistics.bind(statisticsController));

// Increment prescription count
router.post('/:doctorId/statistics/prescriptions/increment', statisticsController.incrementPrescriptionCount.bind(statisticsController));

// Increment patient count
router.post('/:doctorId/statistics/patients/increment', statisticsController.incrementPatientCount.bind(statisticsController));

// Update average prescriptions per day
router.post('/:doctorId/statistics/average/update', statisticsController.updateAveragePrescriptionsPerDay.bind(statisticsController));

// Reset statistics
router.post('/:doctorId/statistics/reset', statisticsController.resetStatistics.bind(statisticsController));

export default router;

