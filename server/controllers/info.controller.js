import { getLocalIpAddress } from '../config/network.js';
import { PORT } from '../config/constants.js';
import mongoose from 'mongoose';
import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { db } from '../db.js';

export class InfoController {
  static async getSystemInfo(req, res, next) {
    try {
      const ip = getLocalIpAddress();
      const httpPort = process.env.HTTP_PORT || 3002;

      let settings = null;
      if (mongoose.connection?.readyState === 1) {
        try {
          settings = await SettingsModel.findOne({ type: 'user' }).lean();
        } catch (e) {}
      }
      if (!settings) {
        settings = db.getSettings();
      }

      let publicDomain = (settings?.publicShareDomain || '').trim();
      if (publicDomain && !/^https?:\/\//i.test(publicDomain)) {
        publicDomain = `https://${publicDomain}`;
      }
      publicDomain = publicDomain.replace(/\/+$/, '');

      const defaultHttpBase = `http://${ip}:${httpPort}`;
      const shareBaseUrl = publicDomain || defaultHttpBase;

      res.json({
        success: true,
        ip,
        port: PORT,
        http_port: httpPort,
        base_url: `https://${ip}:${PORT}`,
        http_base_url: defaultHttpBase,
        public_share_domain: publicDomain || null,
        share_base_url: shareBaseUrl,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
