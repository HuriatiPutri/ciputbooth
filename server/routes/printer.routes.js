import { Router } from 'express';
import { PrinterController } from '../controllers/printer.controller.js';
import { authenticate } from '../adapters/http/middlewares/auth.middleware.js';

const router = Router();

router.get('/config', PrinterController.getConfig);
router.put('/config', authenticate, PrinterController.updateConfig);
router.post('/print', PrinterController.printRemote);

export default router;

