import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';

const router = Router();

router.post('/intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/history', paymentController.getTransactionHistory);

export default router;
