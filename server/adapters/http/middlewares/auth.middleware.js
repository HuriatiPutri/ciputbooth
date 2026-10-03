import { useCases } from '../../../container.js';
import { ForbiddenError } from '../../../domain/errors.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    req.user = await useCases.authenticateToken.execute(scheme === 'Bearer' ? token : null);
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}
