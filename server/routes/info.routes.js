import { Router } from 'express';
import { InfoController } from '../controllers/info.controller.js';

const router = Router();

router.get('/', InfoController.getSystemInfo);

export default router;
