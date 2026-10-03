import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    subscription_status: { type: String, enum: ['active', 'expired', 'none'], default: 'none' },
    subscription_end: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'users' }
);

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
