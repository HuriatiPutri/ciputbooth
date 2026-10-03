import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authenticate } from '../adapters/http/middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, SessionController.getAll);
router.get('/:id', SessionController.getById);
router.post('/', SessionController.create);
router.delete('/:id', authenticate, SessionController.delete);

export default router;
