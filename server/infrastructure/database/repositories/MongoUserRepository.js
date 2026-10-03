import mongoose from 'mongoose';
import { User } from '../../../domain/entities/User.js';
import { ConflictError } from '../../../domain/errors.js';
import { UserModel } from '../models/UserModel.js';

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
    if (!mongoose.isValidObjectId(id)) return null;
    return toEntity(await UserModel.findById(id));
  }

  async findByEmail(email) {
    return toEntity(await UserModel.findOne({ email }));
  }

  async findAll() {
    return (await UserModel.find().sort({ created_at: -1 })).map(toEntity);
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
