import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending', required: true },
    photo_url: { type: String, default: null },
    // Session specific data
    photos: { type: [String], default: [] },
    frame_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Frame', default: null },
    filter_applied: { type: String, default: 'normal' },
    copies: { type: Number, default: 1 },
    order_id: { type: String, unique: true, sparse: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'transactions' }
);

export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
