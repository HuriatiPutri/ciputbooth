import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { googleDriveService } from './google-drive.service.js';
import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { TransactionModel } from '../infrastructure/database/models/TransactionModel.js';
import { db } from '../db.js';
import { PATHS } from '../config/constants.js';

class CloudUploadService {
  /**
   * Read active Google Drive credentials from MongoDB or local database
   */
  async getGoogleDriveConfig() {
    let settings = null;
    if (mongoose.connection?.readyState === 1) {
      try {
        settings = await SettingsModel.findOne({ type: 'user' }).lean();
      } catch (e) {
        console.warn('Error reading SettingsModel for Google Drive:', e.message);
      }
    }

    if (!settings) {
      settings = db.getSettings();
    }

    if (!settings || !settings.googleDriveEnabled) {
      return null;
    }

    const refreshToken = settings.googleDriveRefreshToken || process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    const clientId = settings.googleDriveClientId || process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = settings.googleDriveClientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    const clientEmail = settings.googleDriveClientEmail || process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const privateKey = settings.googleDrivePrivateKey || process.env.GOOGLE_DRIVE_PRIVATE_KEY;
    const rootFolderName = settings.googleDriveRootName || 'Photobooth';

    if (refreshToken && clientId && clientSecret) {
      return {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        rootFolderName,
        rootFolderId: settings.googleDriveFolderId || null
      };
    }

    if (!clientEmail || !privateKey) {
      return null;
    }

    return {
      client_email: clientEmail,
      private_key: privateKey,
      rootFolderName,
      rootFolderId: settings.googleDriveFolderId || null
    };
  }

  /**
   * Asynchronously upload all photos and videos of a session to Google Drive in the background.
   */
  async uploadSessionPhotos(sessionData, absoluteDir) {
    const config = await this.getGoogleDriveConfig();
    const sessionId = String(sessionData.id || sessionData._id);

    if (!config) {
      console.log(`ℹ️ Google Drive upload skipped for session ${sessionId} (Google Drive is not enabled/configured)`);
      return { skipped: true, reason: 'not_configured' };
    }

    console.log(`☁️ Starting private Google Drive upload for session ${sessionId}...`);

    try {
      this.updateSessionUploadStatus(sessionId, 'uploading');

      // 1. Resolve root folder (use custom rootFolderId if set, otherwise find or create folder)
      let rootFolderId = config.rootFolderId;
      if (!rootFolderId) {
        rootFolderId = await googleDriveService.getOrCreateFolder(
          config.rootFolderName || 'Photobooth',
          null,
          config
        );
      }

      // 2. Get or create "Sessions" subfolder inside root folder
      const sessionsFolderId = await googleDriveService.getOrCreateFolder(
        'Sessions',
        rootFolderId,
        config
      );

      // 3. Create dedicated subfolder for this customer session
      const sessionFolderId = await googleDriveService.getOrCreateFolder(
        `SESSION_${sessionId}`,
        sessionsFolderId,
        config
      );

      const driveFiles = [];

      // Helper function to upload local file or base64 data URL
      const uploadFileOrBuffer = async (filePathOrDataUrl, driveFileName, mimeType, fileType) => {
        if (!filePathOrDataUrl) return;

        let fileBuffer = null;
        let finalMimeType = mimeType;

        if (typeof filePathOrDataUrl === 'string' && filePathOrDataUrl.startsWith('data:')) {
          const parts = filePathOrDataUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch && mimeMatch[1]) {
            finalMimeType = mimeMatch[1];
          }
          fileBuffer = Buffer.from(parts[1] || '', 'base64');
        } else if (typeof filePathOrDataUrl === 'string') {
          let absPath = filePathOrDataUrl;
          if (filePathOrDataUrl.startsWith('/uploads')) {
            absPath = path.join(PATHS.UPLOADS_DIR, filePathOrDataUrl.replace('/uploads', ''));
          } else if (absoluteDir && !path.isAbsolute(filePathOrDataUrl)) {
            absPath = path.join(absoluteDir, filePathOrDataUrl);
          }

          if (fs.existsSync(absPath)) {
            fileBuffer = fs.readFileSync(absPath);
          }
        }

        if (fileBuffer && fileBuffer.length > 0) {
          const uploaded = await googleDriveService.uploadFile({
            name: driveFileName,
            mimeType: finalMimeType,
            buffer: fileBuffer,
            folderId: sessionFolderId,
            credentials: config
          });

          driveFiles.push({
            file_type: fileType,
            file_name: driveFileName,
            drive_file_id: uploaded.id,
            mime_type: uploaded.mimeType || finalMimeType,
            file_size: Number(uploaded.size || fileBuffer.length),
            upload_status: 'success'
          });
          console.log(`  ✓ Uploaded to Drive: ${driveFileName} (${uploaded.id})`);
        }
      };

      // A. Upload regular composite strip
      if (sessionData.photo_url || sessionData.composite_url) {
        const fileUrl = sessionData.composite_url || sessionData.photo_url;
        await uploadFileOrBuffer(fileUrl, 'photo_strip_composite.png', 'image/png', 'composite');
      }

      // B. Upload live composite video
      if (sessionData.live_photo_url) {
        await uploadFileOrBuffer(sessionData.live_photo_url, 'live_motion_composite.mp4', 'video/mp4', 'live');
      }

      // C. Upload animated GIF
      if (sessionData.gif_url) {
        await uploadFileOrBuffer(sessionData.gif_url, 'motion_animation.gif', 'image/gif', 'gif');
      }

      // D. Upload individual camera shots
      if (Array.isArray(sessionData.photos)) {
        for (let i = 0; i < sessionData.photos.length; i++) {
          await uploadFileOrBuffer(sessionData.photos[i], `shot_${i + 1}.jpg`, 'image/jpeg', 'shot');
        }
      }

      // E. Upload individual live movement clips
      if (Array.isArray(sessionData.live_clips)) {
        for (let i = 0; i < sessionData.live_clips.length; i++) {
          await uploadFileOrBuffer(sessionData.live_clips[i], `live_clip_${i + 1}.mp4`, 'video/mp4', 'clip');
        }
      }

      // Update session with successful Google Drive metadata
      await this.updateSessionUploadStatus(sessionId, 'success', {
        drive_folder_id: sessionFolderId,
        drive_files: driveFiles
      });

      console.log(`✅ Session ${sessionId} successfully uploaded to private Google Drive (${driveFiles.length} files)`);
      return { success: true, folderId: sessionFolderId, filesCount: driveFiles.length };
    } catch (err) {
      console.error(`❌ Failed to upload session ${sessionId} to Google Drive:`, err);
      await this.updateSessionUploadStatus(sessionId, 'failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper to update session record in MongoDB and local db
   */
  async updateSessionUploadStatus(sessionId, status, extra = {}) {
    const isMongo = Boolean(mongoose.connection?.readyState === 1);

    const updateObj = {
      drive_upload_status: status,
      ...extra
    };

    if (isMongo) {
      try {
        await TransactionModel.findByIdAndUpdate(sessionId, { $set: updateObj });
      } catch (err) {
        console.warn('Could not update MongoDB drive status:', err.message);
      }
    }

    try {
      db.updateSession(sessionId, updateObj);
    } catch (e) {}
  }
}

export const cloudUploadService = new CloudUploadService();

