import { Router } from 'express';
import { FrameController } from '../controllers/frame.controller.js';
import { uploadFrame } from '../middlewares/upload.middleware.js';

import { authenticate } from '../adapters/http/middlewares/auth.middleware.js';

const router = Router();

router.get('/public', FrameController.getPublic);

router.get('/', authenticate, FrameController.getAll);
router.get('/:id', authenticate, FrameController.getById);
router.post('/', authenticate, uploadFrame.single('frame_image'), FrameController.create);
router.put('/:id', authenticate, uploadFrame.single('frame_image'), FrameController.update);
router.delete('/:id', authenticate, FrameController.delete);

export default router;
