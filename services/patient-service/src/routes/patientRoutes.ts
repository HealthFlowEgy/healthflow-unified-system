import { Router } from 'express';
import { PatientController } from '../controllers/patientController';

const router = Router();
const controller = new PatientController();

// Patient CRUD
router.post('/', controller.createPatient.bind(controller));
router.get('/', controller.searchPatients.bind(controller));
router.get('/:id', controller.getPatient.bind(controller));
router.put('/:id', controller.updatePatient.bind(controller));
router.delete('/:id', controller.deletePatient.bind(controller));

// Allergies
router.get('/:id/allergies', controller.getAllergies.bind(controller));
router.post('/:id/allergies', controller.addAllergy.bind(controller));
router.delete('/:patientId/allergies/:allergyId', controller.deleteAllergy.bind(controller));

// Medical History
router.get('/:id/medical-history', controller.getMedicalHistory.bind(controller));
router.post('/:id/medical-history', controller.addMedicalHistory.bind(controller));
router.delete('/:patientId/medical-history/:historyId', controller.deleteMedicalHistory.bind(controller));

// Vital Signs
router.get('/:id/vital-signs', controller.getVitalSigns.bind(controller));
router.post('/:id/vital-signs', controller.addVitalSigns.bind(controller));

export { router as patientRouter };
