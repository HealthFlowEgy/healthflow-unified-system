/**
 * License Routes
 */

import { Router } from 'express';
import { licenseController } from '../controllers/licenseController';

const router = Router();

// Get all licenses for a doctor
router.get('/:doctorId/licenses', licenseController.getLicenses.bind(licenseController));

// Get active licenses for a doctor
router.get('/:doctorId/licenses/active', licenseController.getActiveLicenses.bind(licenseController));

// Get a specific license
router.get('/:doctorId/licenses/:licenseId', licenseController.getLicenseById.bind(licenseController));

// Create a new license
router.post('/:doctorId/licenses', licenseController.createLicense.bind(licenseController));

// Update a license
router.put('/:doctorId/licenses/:licenseId', licenseController.updateLicense.bind(licenseController));

// Delete a license
router.delete('/:doctorId/licenses/:licenseId', licenseController.deleteLicense.bind(licenseController));

// Verify a license
router.post('/:doctorId/licenses/:licenseId/verify', licenseController.verifyLicense.bind(licenseController));

export default router;

