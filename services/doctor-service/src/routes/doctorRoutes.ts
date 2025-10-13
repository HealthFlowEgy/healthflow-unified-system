import { Router } from 'express';
import { DoctorController } from '../controllers/doctorController';

const router = Router();
const controller = new DoctorController();

// Doctor CRUD
router.post('/', controller.createDoctor.bind(controller));
router.get('/', controller.searchDoctors.bind(controller));
router.get('/:id', controller.getDoctor.bind(controller));
router.put('/:id', controller.updateDoctor.bind(controller));
router.delete('/:id', controller.deleteDoctor.bind(controller));

// Schedule Management
router.get('/:id/schedule', controller.getSchedule.bind(controller));
router.post('/:id/schedule', controller.addSchedule.bind(controller));
router.put('/:doctorId/schedule/:scheduleId', controller.updateSchedule.bind(controller));
router.delete('/:doctorId/schedule/:scheduleId', controller.deleteSchedule.bind(controller));

// Statistics
router.get('/:id/stats', controller.getStats.bind(controller));

export { router as doctorRouter };
