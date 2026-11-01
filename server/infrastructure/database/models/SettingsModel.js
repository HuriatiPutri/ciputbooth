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
    printLayout: { type: String, default: '4x6' },
    // Epson Printer Settings
    printerName: { type: String, default: '' },
    paperSize: { type: String, default: '4x6' },
    mediaType: { type: String, default: 'epson_glossy' },
    printQuality: { type: String, default: 'high' },
    colorMode: { type: String, default: 'color' },
    orientation: { type: String, default: 'portrait' },
    borderless: { type: Boolean, default: true },
    fitToPaper: { type: String, default: 'fill' },
    copies: { type: Number, default: 1 },
    // Google Drive & Secure Sharing Settings
    googleDriveEnabled: { type: Boolean, default: false },
    googleDriveClientEmail: { type: String, default: '' },
    googleDrivePrivateKey: { type: String, default: '' },
    googleDriveProjectId: { type: String, default: '' },
    googleDriveFolderId: { type: String, default: '' },
    googleDriveRootName: { type: String, default: 'Photobooth' },
    qrExpiryHours: { type: Number, default: 48 },
    publicShareDomain: { type: String, default: '' }
  },
  { timestamps: true, collection: 'settings' }
);

export const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
