import os from 'os';

/**
 * Returns the primary local IPv4 address of the machine (e.g. 192.168.x.x)
 * for cross-device mobile QR code access.
 */
export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
