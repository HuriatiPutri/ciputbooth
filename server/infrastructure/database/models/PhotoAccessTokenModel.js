import mongoose from 'mongoose';

const photoAccessTokenSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    token_hash: { type: String, required: true, unique: true, index: true },
    token_preview: { type: String, default: '' }, // first 8 chars for admin display & audit
    expires_at: { type: Date, required: true, index: true },
    revoked_at: { type: Date, default: null, index: true },
    access_count: { type: Number, default: 0 },
    last_accessed_at: { type: Date, default: null },
    user_agent: { type: String, default: null },
    ip_address: { type: String, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'photo_access_tokens' }
);

// Index to quickly query active tokens for a session
photoAccessTokenSchema.index({ session_id: 1, revoked_at: 1, expires_at: 1 });

export const PhotoAccessTokenModel =
  mongoose.models.PhotoAccessToken || mongoose.model('PhotoAccessToken', photoAccessTokenSchema);

