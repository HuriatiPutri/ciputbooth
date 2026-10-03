import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';

const router = Router();

router.get('/:id', SessionController.renderShare);

export default router;
