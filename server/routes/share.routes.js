import { Router } from 'express';
import { ShareController } from '../controllers/share.controller.js';

const router = Router();

// In-memory rate limiter: maximum 60 requests per minute per IP to prevent token enumeration/brute-force
const rateLimitMap = new Map();
const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000 };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 60000;
  }

  record.count++;
  rateLimitMap.set(ip, record);

  if (record.count > 60) {
    return res.status(429).send('Too many requests. Please wait a moment and try again.');
  }
  next();
};

// Periodically clean up stale IPs from rateLimitMap
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

router.use(rateLimiter);

// Customer access page via secure token
router.get('/:token', ShareController.renderSharePage);

export default router;
