import { getLocalIpAddress } from '../config/network.js';
import { PORT } from '../config/constants.js';

export class InfoController {
  static getSystemInfo(req, res, next) {
    try {
      const ip = getLocalIpAddress();
      res.json({
        success: true,
        ip,
        port: PORT,
        base_url: `http://${ip}:${PORT}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
