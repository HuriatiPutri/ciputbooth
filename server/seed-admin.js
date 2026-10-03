import { ENV } from './config/env.js';
import { repositories, useCases } from './container.js';
import { USER_ROLES } from './domain/entities/User.js';

/** Ensures a default super admin exists so the system is never locked out. */
export async function seedAdmin() {
  const existing = await repositories.userRepository.findByEmail(ENV.SEED_ADMIN_EMAIL.toLowerCase());
  if (existing) return;

  await useCases.registerUser.execute({
    name: ENV.SEED_ADMIN_NAME,
    email: ENV.SEED_ADMIN_EMAIL,
    password: ENV.SEED_ADMIN_PASSWORD,
    role: USER_ROLES.ADMIN
  });
  console.log(`👤 Seeded admin account: ${ENV.SEED_ADMIN_EMAIL}`);
}
