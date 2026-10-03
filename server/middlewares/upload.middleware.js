import multer from 'multer';
import path from 'path';
import { PATHS, UPLOAD_LIMITS } from '../config/constants.js';

const frameStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATHS.FRAMES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `frame-${uniqueSuffix}${ext}`);
  }
});

export const uploadFrame = multer({
  storage: frameStorage,
  limits: { fileSize: UPLOAD_LIMITS.MAX_FRAME_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/webp' || file.originalname.endsWith('.png')) {
      cb(null, true);
    } else {
      cb(new Error('Only transparent PNG/WEBP images are allowed'));
    }
  }
});
