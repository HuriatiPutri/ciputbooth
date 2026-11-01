import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import mongoose from 'mongoose';
import { db } from '../db.js';

export class SettingsController {
  static async getSettings(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      let settings = null;
      if (mongoose.connection?.readyState === 1) {
        try {
          settings = await SettingsModel.findOne({ user_id: req.user.id }).lean();
          if (!settings) {
            settings = await SettingsModel.create({ user_id: req.user.id, type: 'user' });
          }
        } catch (e) {
          console.warn('MongoDB getSettings error, falling back to db.json:', e.message);
        }
      }

      if (!settings) {
        settings = db.getSettings();
      }

      res.json({ success: true, data: settings || {} });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicSettings(req, res, next) {
    try {
      let settings = null;
      if (mongoose.connection?.readyState === 1) {
        try {
          const User = mongoose.model('User');
          const defaultAdmin = await User.findOne({ role: 'admin' });
          if (defaultAdmin) {
            settings = await SettingsModel.findOne({ user_id: defaultAdmin._id }).lean();
          }
        } catch (e) {}
      }

      if (!settings) {
        settings = db.getSettings();
      }

      res.json({ success: true, data: settings || {} });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      let updated = null;
      if (mongoose.connection?.readyState === 1) {
        try {
          updated = await SettingsModel.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: req.body },
            { new: true, upsert: true }
          ).lean();
        } catch (e) {
          console.warn('MongoDB updateSettings error, using local fallback:', e.message);
        }
      }

      // Always persist to local db.json as well so it survives MongoDB offline state
      const localUpdated = db.updateSettings(req.body);
      if (!updated) {
        updated = localUpdated;
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
