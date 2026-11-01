import { Router } from 'express';
import { ShareController } from '../controllers/share.controller.js';

const router = Router();

// Secure proxy media endpoints
router.get('/:token/info', ShareController.getShareInfo);
router.get('/:token/stream/:type/:index?', ShareController.streamMedia);
router.get('/:token/download/:type/:index?', ShareController.downloadMedia);
router.get('/:token/download-all', ShareController.downloadAllZip);

export default router;

