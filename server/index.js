import express from 'express';
import { ENV } from './config/env.js';
import { connectMongo } from './infrastructure/database/mongo.js';
import { seedAdmin } from './seed-admin.js';
import cors from 'cors';
import { PORT, PATHS, UPLOAD_LIMITS } from './config/constants.js';
import { getLocalIpAddress } from './config/network.js';
import { apiRouter, shareRoutes } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import { seedDefaultFrames } from './seed-frames.js';

const app = express();

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: UPLOAD_LIMITS.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: UPLOAD_LIMITS.BODY_LIMIT }));

// Static file storage
app.use('/uploads', express.static(PATHS.UPLOADS_DIR));

// ==================== ROUTES ====================
app.use('/api', apiRouter);
app.use('/share', shareRoutes);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route to serve the React app for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ==================== ERROR HANDLING ====================
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== SEED DATA & START SERVER ====================
try {
  seedDefaultFrames();
} catch (err) {
  console.error('Error during default frames seed:', err);
}

try {
  await connectMongo(ENV.MONGO_URI);
  await seedAdmin();
} catch (err) {
  console.error('❌ Could not start auth database. Is MongoDB running? (docker compose up -d)\n', err.message);
  process.exit(1);
}

import { createServer } from 'https';
import { initSocket } from './socket.js';
import { getTlsCertificates } from './config/https.js';

const tlsConfig = await getTlsCertificates(PATHS.DATA_DIR);
const server = createServer(tlsConfig, app);
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`✨ CIPUTBOOTH Server running on https://localhost:${PORT}`);
  console.log(`📱 Mobile QR access available at https://${localIp}:${PORT}`);
});
