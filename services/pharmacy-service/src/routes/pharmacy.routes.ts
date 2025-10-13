// Sprint 2 - Pharmacy Management Routes
// ------------------------------------------------------------------------------

import { Router } from 'express';
import { PharmacyController } from '../controllers/pharmacy.controller';
import { authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { 
  pharmacyRegistrationSchema, 
  pharmacyUpdateSchema,
  staffAssignmentSchema 
} from '../schemas/pharmacy.schemas';

const router = Router();
const controller = new PharmacyController();

// Pharmacy CRUD
router.post(
  '/register',
  validateRequest(pharmacyRegistrationSchema),
  controller.registerPharmacy
);

router.get('/', controller.listPharmacies);

router.get('/:id', controller.getPharmacy);

router.put(
  '/:id',
  authorize(['pharmacist', 'admin', 'eda_officer']),
  validateRequest(pharmacyUpdateSchema),
  controller.updatePharmacy
);

router.delete(
  '/:id',
  authorize(['admin', 'eda_officer']),
  controller.deletePharmacy
);

// Staff Management
router.post(
  '/:id/staff',
  authorize(['pharmacist', 'admin']),
  validateRequest(staffAssignmentSchema),
  controller.addStaffMember
);

router.get('/:id/staff', controller.getStaff);

router.delete(
  '/:id/staff/:staffId',
  authorize(['pharmacist', 'admin']),
  controller.removeStaffMember
);

// Pharmacy Status
router.patch(
  '/:id/status',
  authorize(['admin', 'eda_officer']),
  controller.updateStatus
);

router.post(
  '/:id/verify',
  authorize(['eda_officer']),
  controller.verifyPharmacy
);

// Search & Filters
router.get('/search/nearby', controller.findNearby);
router.get('/search/by-city', controller.searchByCity);

export default router;

// ------------------------------------------------------------------------------