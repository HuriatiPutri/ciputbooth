import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';

const router = Router();

import { authenticate } from '../middlewares/auth.middleware.js';

router.get('/revenue', authenticate, ReportController.getRevenueReport);

export default router;

