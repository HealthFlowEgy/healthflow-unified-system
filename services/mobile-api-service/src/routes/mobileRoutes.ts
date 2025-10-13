import { Router } from 'express';
import { mobileController } from '../controllers/mobileController';

const router = Router();

router.post('/push/register', mobileController.registerPushToken);
router.get('/sync/pending', mobileController.getPendingSync);
router.post('/sync/upload', mobileController.uploadSync);

export default router;
