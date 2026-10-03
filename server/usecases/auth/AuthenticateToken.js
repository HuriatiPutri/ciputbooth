import { ForbiddenError, UnauthorizedError } from '../../domain/errors.js';

/** Resolves a bearer token into the current, still-active user. */
export class AuthenticateToken {
  constructor({ userRepository, tokenService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute(token) {
    if (!token) throw new UnauthorizedError();

    let payload;
    try {
      payload = this.tokenService.verify(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError('Account no longer exists');
    if (!user.isActive) throw new ForbiddenError('This account has been deactivated');
    return user;
  }
}
