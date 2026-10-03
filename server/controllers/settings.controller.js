import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';

export class SettingsController {
  static async getSettings(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      let settings = await SettingsModel.findOne({ user_id: req.user.id }).lean();
      if (!settings) {
        settings = await SettingsModel.create({ user_id: req.user.id, type: 'user' });
      }
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicSettings(req, res, next) {
    try {
      // Find default admin settings
      const mongoose = await import('mongoose');
      const User = mongoose.model('User');
      const defaultAdmin = await User.findOne({ role: 'admin' });
      let settings = null;
      
      if (defaultAdmin) {
        settings = await SettingsModel.findOne({ user_id: defaultAdmin._id }).lean();
      }
      
      res.json({ success: true, data: settings || {} });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const updated = await SettingsModel.findOneAndUpdate(
        { user_id: req.user.id },
        { $set: req.body },
        { new: true, upsert: true }
      ).lean();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
