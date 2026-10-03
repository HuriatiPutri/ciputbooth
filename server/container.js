import { ENV } from './config/env.js';
import { MongoUserRepository } from './infrastructure/database/repositories/MongoUserRepository.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenService } from './infrastructure/security/JwtTokenService.js';
import { RegisterUser } from './usecases/auth/RegisterUser.js';
import { LoginUser } from './usecases/auth/LoginUser.js';
import { AuthenticateToken } from './usecases/auth/AuthenticateToken.js';
import { ListUsers } from './usecases/users/ListUsers.js';
import { MongoEventRepository } from './infrastructure/database/repositories/MongoEventRepository.js';
import { LegacyFrameCatalog } from './infrastructure/legacy/LegacyFrameCatalog.js';
import { CreateEvent } from './usecases/events/CreateEvent.js';
import { UpdateEvent } from './usecases/events/UpdateEvent.js';
import { DeleteEvent } from './usecases/events/DeleteEvent.js';
import { ListEvents } from './usecases/events/ListEvents.js';
import { GetKioskEvent } from './usecases/events/GetKioskEvent.js';
import { MidtransPaymentGateway } from './infrastructure/payments/MidtransPaymentGateway.js';
import { CreatePaymentTransaction } from './usecases/payments/CreatePaymentTransaction.js';
/** Composition root: the only place where concrete implementations are wired. */
const userRepository = new MongoUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService({ secret: ENV.JWT_SECRET, expiresIn: ENV.JWT_EXPIRES_IN });
const eventRepository = new MongoEventRepository();
const frameCatalog = new LegacyFrameCatalog();
const paymentGateway = new MidtransPaymentGateway();

export const useCases = {
  registerUser: new RegisterUser({ userRepository, passwordHasher }),
  loginUser: new LoginUser({ userRepository, passwordHasher, tokenService }),
  authenticateToken: new AuthenticateToken({ userRepository, tokenService }),
  listUsers: new ListUsers({ userRepository }),
  createEvent: new CreateEvent({ eventRepository, frameCatalog }),
  updateEvent: new UpdateEvent({ eventRepository, frameCatalog }),
  deleteEvent: new DeleteEvent({ eventRepository }),
  listEvents: new ListEvents({ eventRepository }),
  getKioskEvent: new GetKioskEvent({ eventRepository, frameCatalog }),
  createPaymentTransaction: new CreatePaymentTransaction({ eventRepository, paymentGateway })
};

export const repositories = { userRepository };
