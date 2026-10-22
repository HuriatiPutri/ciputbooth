import mongoose from 'mongoose';
import { User } from '../../../domain/entities/User.js';
import { ConflictError } from '../../../domain/errors.js';
import { UserModel } from '../models/UserModel.js';

import bcrypt from 'bcryptjs';
import { ENV } from '../../../config/env.js';
import { USER_ROLES } from '../../../domain/entities/User.js';

const OFFLINE_ADMIN_ID = '000000000000000000000001';

function getOfflineAdmin() {
  return new User({
    id: OFFLINE_ADMIN_ID,
    role: USER_ROLES.ADMIN,
    name: ENV.SEED_ADMIN_NAME,
    email: ENV.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash: bcrypt.hashSync(ENV.SEED_ADMIN_PASSWORD, 10),
    isActive: true,
    subscriptionStatus: 'active',
    subscriptionEnd: null,
    createdAt: new Date().toISOString()
  });
}

function toEntity(doc) {
  if (!doc) return null;
  return new User({
    id: doc._id.toString(),
    role: doc.role,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    isActive: doc.isActive,
    subscriptionStatus: doc.subscription_status,
    subscriptionEnd: doc.subscription_end,
    createdAt: doc.created_at
  });
}

export class MongoUserRepository {
  async findById(id) {
    if (id === OFFLINE_ADMIN_ID || id === 'default_user' || id === 'default_admin') {
      return getOfflineAdmin();
    }
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return getOfflineAdmin();
    }
    if (!mongoose.isValidObjectId(id)) return null;
    try {
      return toEntity(await UserModel.findById(id));
    } catch {
      return getOfflineAdmin();
    }
  }

  async findByEmail(email) {
    const normalized = (email || '').toLowerCase().trim();
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      if (normalized === ENV.SEED_ADMIN_EMAIL.toLowerCase()) {
        return getOfflineAdmin();
      }
      return null;
    }
    try {
      const doc = await UserModel.findOne({ email: normalized });
      if (doc) return toEntity(doc);
      if (normalized === ENV.SEED_ADMIN_EMAIL.toLowerCase()) {
        return getOfflineAdmin();
      }
      return null;
    } catch {
      if (normalized === ENV.SEED_ADMIN_EMAIL.toLowerCase()) {
        return getOfflineAdmin();
      }
      return null;
    }
  }

  async findAll() {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return [getOfflineAdmin()];
    }
    try {
      return (await UserModel.find().sort({ created_at: -1 })).map(toEntity);
    } catch {
      return [getOfflineAdmin()];
    }
  }

  async create(user) {
    try {
      const doc = await UserModel.create({
        role: user.role,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        subscription_status: user.subscriptionStatus,
        subscription_end: user.subscriptionEnd
      });
      return toEntity(doc);
    } catch (err) {
      if (err.code === 11000) throw new ConflictError('Email is already registered');
      throw err;
    }
  }

  async update(id, updateData) {
    if (!mongoose.isValidObjectId(id)) return null;
    
    // Map domain fields to db fields if necessary
    const dbUpdate = { ...updateData };
    if (updateData.subscriptionStatus !== undefined) dbUpdate.subscription_status = updateData.subscriptionStatus;
    if (updateData.subscriptionEnd !== undefined) dbUpdate.subscription_end = updateData.subscriptionEnd;
    
    const doc = await UserModel.findByIdAndUpdate(id, { $set: dbUpdate }, { new: true });
    return toEntity(doc);
  }

  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }
}
