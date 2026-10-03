import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');

export const PORT = process.env.PORT || 3001;

export const PATHS = {
  DATA_DIR: path.join(SERVER_ROOT, 'data'),
  UPLOADS_DIR: path.join(SERVER_ROOT, 'uploads'),
  FRAMES_DIR: path.join(SERVER_ROOT, 'uploads', 'frames'),
  SESSIONS_DIR: path.join(SERVER_ROOT, 'uploads', 'sessions')
};

export const UPLOAD_LIMITS = {
  MAX_FRAME_SIZE: 25 * 1024 * 1024, // 25MB
  BODY_LIMIT: '50mb'
};
