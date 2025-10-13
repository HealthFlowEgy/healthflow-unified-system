import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

router.get('/', dashboardController.listDashboards.bind(dashboardController));
router.get('/:id', dashboardController.getDashboard.bind(dashboardController));
router.post('/', dashboardController.createDashboard.bind(dashboardController));
router.put('/:id', dashboardController.updateDashboard.bind(dashboardController));

export default router;
