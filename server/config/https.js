import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';
import { getLocalIpAddress } from './network.js';

export async function getTlsCertificates(dataDir) {
  const certPath = path.join(dataDir, 'cert.pem');
  const keyPath = path.join(dataDir, 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  }

  console.log('Generating self-signed certificate for HTTPS (needed for iPad camera access)...');
  const ip = getLocalIpAddress();
  
  const attrs = [{ name: 'commonName', value: ip }];
  const options = {
    days: 3650,
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: ip }
      ]
    }]
  };

  const pems = await selfsigned.generate(attrs, options);
  
  // Save for future use
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);

  return {
    cert: pems.cert,
    key: pems.private
  };
}
