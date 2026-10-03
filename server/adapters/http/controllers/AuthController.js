import { useCases } from '../../../container.js';
import { USER_ROLES } from '../../../domain/entities/User.js';

export class AuthController {
  /** Public sign-up always creates a regular "user" (vendor); role cannot be chosen by the caller. */
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await useCases.registerUser.execute({ name, email, password, role: USER_ROLES.USER });
      res.status(201).json({ success: true, data: user.toPublic() });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { token, user } = await useCases.loginUser.execute(req.body);
      res.json({ success: true, data: { token, user } });
    } catch (err) {
      next(err);
    }
  }

  static me(req, res) {
    res.json({ success: true, data: req.user.toPublic() });
  }
}
