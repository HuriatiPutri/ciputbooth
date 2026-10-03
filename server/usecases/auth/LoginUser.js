import { User } from '../../domain/entities/User.js';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors.js';

export class LoginUser {
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
    const user = await this.userRepository.findByEmail(User.normalizeEmail(email));
    const passwordMatches =
      user && (await this.passwordHasher.compare(String(password || ''), user.passwordHash));

    // Same message for unknown email and wrong password to avoid user enumeration.
    if (!passwordMatches) throw new UnauthorizedError('Invalid email or password');
    if (!user.isActive) throw new ForbiddenError('This account has been deactivated');

    const token = this.tokenService.sign({ sub: user.id, role: user.role });
    return { token, user: user.toPublic() };
  }
}
