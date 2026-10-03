import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate } from '../adapters/http/middlewares/auth.middleware.js';

const router = Router();

router.get('/public', SettingsController.getPublicSettings);
router.get('/', authenticate, SettingsController.getSettings);
router.put('/', authenticate, SettingsController.updateSettings);

export default router;
