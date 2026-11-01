import fs from 'fs';
import path from 'path';
import { tokenService } from '../services/token.service.js';
import { SessionService } from '../services/session.service.js';
import { googleDriveService } from '../services/google-drive.service.js';
import { cloudUploadService } from '../services/cloud-upload.service.js';
import { renderSharePage, renderSecurityNoticePage } from '../views/share-page.template.js';
import { PATHS } from '../config/constants.js';

export class ShareController {
  /**
   * Render the customer's mobile photo sharing page
   */
  static async renderSharePage(req, res, next) {
    try {
      const { token } = req.params;
      const validation = await tokenService.validateToken(token, {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');

      if (!validation.valid) {
        return res.status(200).send(renderSecurityNoticePage(validation.reason));
      }

      const session = await SessionService.getSessionById(validation.session_id);
      if (!session) {
        return res.status(200).send(renderSecurityNoticePage('not_found'));
      }

      const activeToken = validation.tokenDoc?.raw_token || token;
      res.send(renderSharePage(session, validation.tokenDoc, activeToken));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get session media metadata without exposing any private Drive IDs
   */
  static async getShareInfo(req, res, next) {
    try {
      const { token } = req.params;
      const validation = await tokenService.validateToken(token);

      if (!validation.valid) {
        return res.status(403).json({ success: false, reason: validation.reason });
      }

      const session = await SessionService.getSessionById(validation.session_id);
      if (!session) {
        return res.status(404).json({ success: false, reason: 'not_found' });
      }

      const shotsCount = Array.isArray(session.photos) ? session.photos.length : 0;
      const clipsCount = Array.isArray(session.live_clips) ? session.live_clips.length : 0;

      res.json({
        success: true,
        expires_at: validation.tokenDoc?.expires_at,
        has_composite: Boolean(session.composite_url || session.photo_url),
        has_live: Boolean(session.live_photo_url),
        has_gif: Boolean(session.gif_url),
        shots_count: shotsCount,
        clips_count: clipsCount,
        drive_status: session.drive_upload_status || 'local'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Resolve file target: streams from Google Drive if uploaded, or local disk fallback
   */
  static async resolveAndStreamMedia(req, res, isDownload = false) {
    const { token, type, index } = req.params;
    const validation = await tokenService.validateToken(token);

    if (!validation.valid) {
      return res.status(403).send('Unauthorized: Invalid or expired access token');
    }

    const session = await SessionService.getSessionById(validation.session_id);
    if (!session) {
      return res.status(404).send('Session photos not found');
    }

    let targetFile = null;
    let fallbackLocalPath = null;
    let mimeType = 'image/png';
    let filename = `photobooth_${session.id}.png`;

    // 1. Identify requested media item
    if (type === 'composite') {
      filename = `photo_strip_${session.id}.png`;
      mimeType = 'image/png';
      fallbackLocalPath = session.composite_url || session.photo_url;
      targetFile = (session.drive_files || []).find((f) => f.file_type === 'composite');
    } else if (type === 'live') {
      filename = `live_motion_${session.id}.mp4`;
      mimeType = 'video/mp4';
      fallbackLocalPath = session.live_photo_url;
      targetFile = (session.drive_files || []).find((f) => f.file_type === 'live');
    } else if (type === 'gif') {
      filename = `animation_${session.id}.gif`;
      mimeType = 'image/gif';
      fallbackLocalPath = session.gif_url;
      targetFile = (session.drive_files || []).find((f) => f.file_type === 'gif');
    } else if (type === 'shot') {
      const idx = parseInt(index || '0', 10);
      filename = `shot_${idx + 1}_${session.id}.jpg`;
      mimeType = 'image/jpeg';
      fallbackLocalPath = session.photos?.[idx];
      const shotFiles = (session.drive_files || []).filter((f) => f.file_type === 'shot');
      targetFile = shotFiles[idx];
    } else if (type === 'clip') {
      const idx = parseInt(index || '0', 10);
      filename = `live_clip_${idx + 1}_${session.id}.mp4`;
      mimeType = 'video/mp4';
      fallbackLocalPath = session.live_clips?.[idx];
      const clipFiles = (session.drive_files || []).filter((f) => f.file_type === 'clip');
      targetFile = clipFiles[idx];
    }

    // Headers to forbid caching and prevent privacy leaks
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', mimeType);

    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    // 2. Stream from private Google Drive if file is stored in Drive
    if (targetFile && targetFile.drive_file_id) {
      try {
        const driveConfig = await cloudUploadService.getGoogleDriveConfig();
        if (driveConfig) {
          const { stream, metadata } = await googleDriveService.streamFile(
            targetFile.drive_file_id,
            driveConfig
          );
          if (metadata?.size) {
            res.setHeader('Content-Length', metadata.size);
          }
          return stream.pipe(res);
        }
      } catch (driveErr) {
        console.warn(`Failed to stream from Drive for ID ${targetFile.drive_file_id}, using local fallback:`, driveErr.message);
      }
    }

    // 3. Fallback: stream from local file system or base64 data URL
    if (fallbackLocalPath && typeof fallbackLocalPath === 'string') {
      if (fallbackLocalPath.startsWith('data:')) {
        const parts = fallbackLocalPath.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch && mimeMatch[1]) {
          res.setHeader('Content-Type', mimeMatch[1]);
        }
        const buffer = Buffer.from(parts[1] || '', 'base64');
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }

      let absLocalPath = fallbackLocalPath;
      if (fallbackLocalPath.startsWith('/uploads')) {
        absLocalPath = path.join(PATHS.UPLOADS_DIR, fallbackLocalPath.replace('/uploads', ''));
      }

      if (fs.existsSync(absLocalPath)) {
        const stat = fs.statSync(absLocalPath);
        res.setHeader('Content-Length', stat.size);
        const fileStream = fs.createReadStream(absLocalPath);
        return fileStream.pipe(res);
      }
    }

    return res.status(404).send('File not found or still processing');
  }

  static async streamMedia(req, res, next) {
    try {
      await ShareController.resolveAndStreamMedia(req, res, false);
    } catch (err) {
      next(err);
    }
  }

  static async downloadMedia(req, res, next) {
    try {
      await ShareController.resolveAndStreamMedia(req, res, true);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bundles all available session files into a downloadable ZIP archive on the fly
   */
  static async downloadAllZip(req, res, next) {
    try {
      const { token } = req.params;
      const validation = await tokenService.validateToken(token);

      if (!validation.valid) {
        return res.status(403).send('Unauthorized: Invalid or expired access token');
      }

      const session = await SessionService.getSessionById(validation.session_id);
      if (!session) {
        return res.status(404).send('Session not found');
      }

      // Collect local files for zipping
      const filesToZip = [];
      const addFile = (urlPath, zipName) => {
        if (!urlPath) return;
        if (typeof urlPath === 'string' && urlPath.startsWith('data:')) {
          const parts = urlPath.split(',');
          const buffer = Buffer.from(parts[1] || '', 'base64');
          filesToZip.push({ name: zipName, buffer });
          return;
        }
        let abs = urlPath;
        if (urlPath.startsWith('/uploads')) {
          abs = path.join(PATHS.UPLOADS_DIR, urlPath.replace('/uploads', ''));
        }
        if (fs.existsSync(abs)) {
          filesToZip.push({ name: zipName, buffer: fs.readFileSync(abs) });
        }
      };

      addFile(session.composite_url || session.photo_url, `photo_strip_${session.id}.png`);
      addFile(session.live_photo_url, `live_motion_${session.id}.mp4`);
      addFile(session.gif_url, `animation_${session.id}.gif`);

      (session.photos || []).forEach((p, idx) => {
        addFile(p, `shot_${idx + 1}.jpg`);
      });

      (session.live_clips || []).forEach((c, idx) => {
        addFile(c, `live_clip_${idx + 1}.mp4`);
      });

      if (filesToZip.length === 0) {
        return res.status(404).send('No files found to archive');
      }

      // Generate standard uncompressed ZIP container (ZIP Store mode)
      const zipBuffer = createSimpleZip(filesToZip);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="ciputbooth_session_${session.id}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.send(zipBuffer);
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Pure Node.js uncompressed ZIP archive generator (zero external dependencies)
 */
function createSimpleZip(files) {
  const localFileHeaders = [];
  const centralDirectoryHeaders = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuffer = Buffer.from(file.name, 'utf8');
    const crc = crc32(file.buffer);
    const size = file.buffer.length;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4); // Min version
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(0, 8); // Compression method (0 = stored)
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(size, 18); // Compressed size
    localHeader.writeUInt32LE(size, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuffer.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    filenameBuffer.copy(localHeader, 30);

    localFileHeaders.push(localHeader, file.buffer);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4); // Made by
    centralHeader.writeUInt16LE(20, 6); // Min version
    centralHeader.writeUInt16LE(0, 8); // Flags
    centralHeader.writeUInt16LE(0, 10); // Compression method (0 = stored)
    centralHeader.writeUInt16LE(0, 12); // Mod time
    centralHeader.writeUInt16LE(0, 14); // Mod date
    centralHeader.writeUInt32LE(crc, 16); // CRC-32
    centralHeader.writeUInt32LE(size, 20); // Compressed size
    centralHeader.writeUInt32LE(size, 24); // Uncompressed size
    centralHeader.writeUInt16LE(filenameBuffer.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    filenameBuffer.copy(centralHeader, 46);

    centralDirectoryHeaders.push(centralHeader);

    offset += localHeader.length + size;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralDirectoryHeaders) centralDirSize += c.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Total entries on this disk
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localFileHeaders, ...centralDirectoryHeaders, eocd]);
}

/**
 * Standard IEEE 802.3 CRC-32 calculator
 */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

