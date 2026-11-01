import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    event_id: { type: mongoose.Schema.Types.Mixed, required: true, default: 'default_event', index: true },
    event_name: { type: String, default: null },
    user_id: { type: mongoose.Schema.Types.Mixed, required: true, default: 'default_user', index: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending', required: true },
    photo_url: { type: String, default: null },
    gif_url: { type: String, default: null },
    live_photo_url: { type: String, default: null },
    frame_name: { type: String, default: 'Photo Strip' },
    // Session specific data
    photos: { type: [String], default: [] },
    live_clips: { type: [String], default: [] },
    frame_id: { type: mongoose.Schema.Types.Mixed, default: null },
    filter_applied: { type: String, default: 'normal' },
    copies: { type: Number, default: 1 },
    order_id: { type: String, unique: true, sparse: true },
    // Google Drive & Secure Sharing tracking
    drive_folder_id: { type: String, default: null },
    drive_upload_status: {
      type: String,
      enum: ['not_started', 'pending', 'uploading', 'success', 'failed'],
      default: 'not_started'
    },
    drive_files: { type: Array, default: [] },
    secure_token: { type: String, default: null },
    secure_token_hash: { type: String, default: null },
    token_expires_at: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'transactions' }
);

export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
