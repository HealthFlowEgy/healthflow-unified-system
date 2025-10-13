// Sprint 2 - Dispensing Routes
// ------------------------------------------------------------------------------

import { Router } from 'express';
import { DispensingController } from '../controllers/dispensing.controller';
import { authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { dispensingSchema, verifyPrescriptionSchema } from '../schemas/dispensing.schemas';

const router = Router();
const controller = new DispensingController();

// Prescription Lookup
router.get(
  '/:pharmacyId/prescriptions/pending',
  authorize(['pharmacist']),
  controller.getPendingPrescriptions
);

router.get(
  '/:pharmacyId/prescriptions/search',
  authorize(['pharmacist']),
  controller.searchPrescriptions
);

router.get(
  '/:pharmacyId/prescriptions/:prescriptionId',
  authorize(['pharmacist']),
  controller.getPrescription
);

// Prescription Verification
router.post(
  '/:pharmacyId/prescriptions/:prescriptionId/verify',
  authorize(['pharmacist']),
  validateRequest(verifyPrescriptionSchema),
  controller.verifyPrescription
);

// Dispensing
router.post(
  '/:pharmacyId/dispense',
  authorize(['pharmacist']),
  validateRequest(dispensingSchema),
  controller.dispensePrescription
);

router.post(
  '/:pharmacyId/dispense/partial',
  authorize(['pharmacist']),
  controller.partialDispensing
);

// Dispensing History
router.get(
  '/:pharmacyId/history',
  authorize(['pharmacist']),
  controller.getDispensingHistory
);

router.get(
  '/:pharmacyId/history/:recordId',
  authorize(['pharmacist']),
  controller.getDispensingRecord
);

// Receipts
router.get(
  '/:pharmacyId/receipts/:recordId/print',
  authorize(['pharmacist']),
  controller.printReceipt
);

router.post(
  '/:pharmacyId/receipts/:recordId/email',
  authorize(['pharmacist']),
  controller.emailReceipt
);

export default router;

// ------------------------------------------------------------------------------