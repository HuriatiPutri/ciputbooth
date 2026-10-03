import { Router } from 'express';
import frameRoutes from './frame.routes.js';
import sessionRoutes from './session.routes.js';
import settingsRoutes from './settings.routes.js';
import infoRoutes from './info.routes.js';
import shareRoutes from './share.routes.js';
import authRoutes from '../adapters/http/routes/auth.routes.js';
import userRoutes from '../adapters/http/routes/user.routes.js';
import eventRoutes from '../adapters/http/routes/event.routes.js';
import reportRoutes from '../adapters/http/routes/report.routes.js';

import paymentRoutes from './payment.routes.js';

const apiRouter = Router();

// API resources
apiRouter.use('/frames', frameRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/info', infoRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/events', eventRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/payments', paymentRoutes);

export { apiRouter, shareRoutes };
