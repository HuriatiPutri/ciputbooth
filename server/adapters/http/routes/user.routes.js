import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../../../domain/entities/User.js';

const router = Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN));
router.get('/', UserController.list);
router.get('/stats', UserController.stats);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);

export default router;
