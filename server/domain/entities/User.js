import { ValidationError } from '../errors.js';

export const USER_ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user' });
export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  NONE: 'none'
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Core business entity. Framework- and database-agnostic.
 */
export class User {
  constructor({
    id = null,
    role = USER_ROLES.USER,
    name,
    email,
    passwordHash,
    isActive = true,
    subscriptionStatus = SUBSCRIPTION_STATUS.NONE,
    subscriptionEnd = null,
    createdAt = null
  }) {
    this.id = id;
    this.role = role;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.isActive = isActive;
    this.subscriptionStatus = subscriptionStatus;
    this.subscriptionEnd = subscriptionEnd;
    this.createdAt = createdAt;
  }

  static normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  static validateRegistration({ name, email, password, role }) {
    if (!name || !String(name).trim()) throw new ValidationError('Name is required');
    if (!EMAIL_PATTERN.test(User.normalizeEmail(email))) throw new ValidationError('A valid email is required');
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (role && !Object.values(USER_ROLES).includes(role)) throw new ValidationError('Invalid role');
  }

  isAdmin() {
    return this.role === USER_ROLES.ADMIN;
  }

  hasActiveSubscription(now = new Date()) {
    if (this.isAdmin()) return true;
    return (
      this.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE &&
      (!this.subscriptionEnd || new Date(this.subscriptionEnd) > now)
    );
  }

  /** Safe representation that never leaks the password hash. */
  toPublic() {
    return {
      id: this.id,
      role: this.role,
      name: this.name,
      email: this.email,
      isActive: this.isActive,
      subscriptionStatus: this.subscriptionStatus,
      subscriptionEnd: this.subscriptionEnd,
      createdAt: this.createdAt
    };
  }
}
