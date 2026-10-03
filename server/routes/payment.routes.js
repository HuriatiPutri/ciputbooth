import express from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/create-transaction', PaymentController.createTransaction);
router.post('/webhook', PaymentController.webhook);
router.get('/status/:orderId', PaymentController.getTransactionStatus);

export default router;
