import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { getIO } from '../socket.js';
import fs from 'fs';
import path from 'path';

export class PrinterController {
  /**
   * Get printer config from database or local file
   */
  static async getConfig(req, res, next) {
    try {
      let settings = null;
      if (req.user) {
        settings = await SettingsModel.findOne({ user_id: req.user.id }).lean();
      }
      if (!settings) {
        settings = await SettingsModel.findOne({ type: 'user' }).lean();
      }

      const config = {
        printerName: settings?.printerName || '',
        paperSize: settings?.paperSize || '4x6',
        mediaType: settings?.mediaType || 'epson_glossy',
        printQuality: settings?.printQuality || 'high',
        colorMode: settings?.colorMode || 'color',
        orientation: settings?.orientation || 'portrait',
        borderless: settings?.borderless !== false,
        fitToPaper: settings?.fitToPaper || 'fill',
        copies: settings?.copies || 1
      };

      res.json({ success: true, config });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update printer config
   */
  static async updateConfig(req, res, next) {
    try {
      const updateData = req.body;
      let filter = {};
      if (req.user) {
        filter = { user_id: req.user.id };
      } else {
        filter = { type: 'user' };
      }

      const updated = await SettingsModel.findOneAndUpdate(
        filter,
        { $set: updateData },
        { new: true, upsert: true }
      ).lean();

      res.json({ success: true, config: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remote print trigger (from iPad or remote dashboard)
   */
  static async printRemote(req, res, next) {
    try {
      const { photoUrl, copies, source = 'customer' } = req.body;
      if (!photoUrl) {
        return res.status(400).json({ success: false, message: 'photoUrl is required' });
      }

      try {
        const io = getIO();
        const payload = {
          action: 'PRINT_JOB',
          photoUrl,
          copies: copies || 1,
          source
        };
        // Emit to main display room and broadcast to all connected devices
        io.to('display').emit('kiosk_action', payload);
        io.emit('kiosk_action', payload);
        console.log('📡 Broadcasted remote PRINT_JOB to display');
      } catch (e) {
        console.warn('Socket broadcast failed:', e.message);
      }

      res.json({ success: true, message: 'Print job dispatched to photobooth display' });
    } catch (err) {
      next(err);
    }
  }
}

