import { Router } from 'express';
import { googleDriveService } from '../services/google-drive.service.js';
import { cloudUploadService } from '../services/cloud-upload.service.js';
import { tokenService } from '../services/token.service.js';
import { SessionService } from '../services/session.service.js';
import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { authenticate } from '../adapters/http/middlewares/auth.middleware.js';
import { getLocalIpAddress } from '../config/network.js';
import mongoose from 'mongoose';
import { db } from '../db.js';

const router = Router();

// Test connection to Google Drive
router.post('/test-connection', authenticate, async (req, res, next) => {
  try {
    let credentials = req.body;
    const refreshToken = (credentials?.googleDriveRefreshToken || credentials?.refresh_token || '').trim();
    const clientId = (credentials?.googleDriveClientId || credentials?.client_id || '').trim();
    const clientSecret = (credentials?.googleDriveClientSecret || credentials?.client_secret || '').trim();

    const clientEmail = (credentials?.googleDriveClientEmail || credentials?.client_email || '').trim();
    const privateKey = (credentials?.googleDrivePrivateKey || credentials?.private_key || '').trim();

    if ((!refreshToken || !clientId || !clientSecret) && (!clientEmail || !privateKey)) {
      // Use saved settings
      const savedConfig = await cloudUploadService.getGoogleDriveConfig();
      if (!savedConfig) {
        return res.status(400).json({
          success: false,
          message: 'Kredensial Google Drive wajib diisi (OAuth2 Refresh Token atau Service Account).'
        });
      }
      credentials = savedConfig;
    } else if (refreshToken && clientId && clientSecret) {
      credentials = {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      };
    } else {
      credentials = {
        client_email: clientEmail,
        private_key: privateKey,
        project_id: credentials.googleDriveProjectId || credentials.project_id || ''
      };
    }

    const result = await googleDriveService.testConnection(credentials);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Gagal terhubung ke Google Drive API'
      });
    }

    res.json({
      success: true,
      message: 'Koneksi ke Google Drive API berhasil!',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Retry Google Drive upload for a session
router.post('/retry-upload/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const uploadRes = await cloudUploadService.uploadSessionPhotos(session, '');
    res.json({
      success: uploadRes?.success !== false,
      message: uploadRes?.success ? 'Upload berhasil' : (uploadRes?.error || 'Upload gagal'),
      data: uploadRes
    });
  } catch (err) {
    next(err);
  }
});

// Revoke access token for a session
router.post('/revoke-token/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.secure_token) {
      await tokenService.revokeToken(session.secure_token);
    }

    res.json({
      success: true,
      message: 'QR Code access has been revoked.',
      data: { success: true }
    });
  } catch (err) {
    next(err);
  }
});

// Regenerate fresh token and QR code for a session
router.post('/regenerate-token/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { expiryHours } = req.body;
    const session = await SessionService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const tokenData = await tokenService.regenerateSessionToken(sessionId, expiryHours);

    // Update session share URL
    let settings = null;
    if (mongoose.connection?.readyState === 1) {
      settings = await SettingsModel.findOne({ type: 'user' }).lean().catch(() => null);
    }
    if (!settings) settings = db.getSettings();

    const localIp = getLocalIpAddress();
    const httpPort = process.env.HTTP_PORT || 3002;
    let publicDomain = (settings?.publicShareDomain || '').trim();
    if (publicDomain && !/^https?:\/\//i.test(publicDomain)) {
      publicDomain = `https://${publicDomain}`;
    }
    publicDomain = publicDomain.replace(/\/+$/, '');
    const baseHost = publicDomain || `http://${localIp}:${httpPort}`;
    const newShareUrl = `${baseHost}/share/${tokenData.rawToken}`;

    // Update session record
    if (mongoose.connection?.readyState === 1) {
      await mongoose.model('Transaction').findByIdAndUpdate(sessionId, {
        $set: {
          secure_token: tokenData.rawToken,
          secure_token_hash: tokenData.tokenHash,
          token_expires_at: tokenData.expiresAt
        }
      });
    }

    db.updateSession(sessionId, {
      secure_token: tokenData.rawToken,
      secure_token_hash: tokenData.tokenHash,
      token_expires_at: tokenData.expiresAt.toISOString(),
      share_url: newShareUrl
    });

    res.json({
      success: true,
      message: 'Token regenerated successfully',
      data: {
        success: true,
        rawToken: tokenData.rawToken,
        shareUrl: newShareUrl,
        expiresAt: tokenData.expiresAt
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

