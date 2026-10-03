import { User, USER_ROLES } from '../../domain/entities/User.js';
import { ConflictError } from '../../domain/errors.js';

/**
 * @param {{ userRepository: object, passwordHasher: object }} deps
 *   userRepository: findByEmail(email), create(user)
 *   passwordHasher: hash(plain), compare(plain, hash)
 */
export class RegisterUser {
  constructor({ userRepository, passwordHasher }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async execute({ name, email, password, role = USER_ROLES.USER }) {
    User.validateRegistration({ name, email, password, role });

    const normalizedEmail = User.normalizeEmail(email);
    if (await this.userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictError('Email is already registered');
    }

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      role,
      passwordHash: await this.passwordHasher.hash(password)
    });

    return this.userRepository.create(user);
  }
}
