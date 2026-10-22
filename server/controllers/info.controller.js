import { getLocalIpAddress } from '../config/network.js';
import { PORT } from '../config/constants.js';

export class InfoController {
  static getSystemInfo(req, res, next) {
    try {
      const ip = getLocalIpAddress();
      const httpPort = process.env.HTTP_PORT || 3002;
      res.json({
        success: true,
        ip,
        port: PORT,
        http_port: httpPort,
        base_url: `https://${ip}:${PORT}`,
        http_base_url: `http://${ip}:${httpPort}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
