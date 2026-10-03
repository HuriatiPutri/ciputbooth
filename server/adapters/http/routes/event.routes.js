import { Router } from 'express';
import { EventController } from '../controllers/EventController.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Public kiosk lookup (declared before the authenticated routes).
router.get('/:id/kiosk', EventController.kiosk);

router.use(authenticate);
router.get('/', EventController.list);
router.post('/', EventController.create);
router.put('/:id', EventController.update);
router.delete('/:id', EventController.remove);

export default router;
