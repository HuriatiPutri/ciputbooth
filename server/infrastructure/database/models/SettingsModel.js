import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    type: { type: String, default: 'user' },
    studioName: { type: String, default: 'Ciput Studio Booth' },
    countdownSeconds: { type: Number, default: 3 },
    autoPrint: { type: Boolean, default: false },
    copiesCount: { type: Number, default: 1 },
    enableStickers: { type: Boolean, default: true },
    enableFilters: { type: Boolean, default: true },
    printLayout: { type: String, default: '4x6' }
  },
  { timestamps: true, collection: 'settings' }
);

export const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
