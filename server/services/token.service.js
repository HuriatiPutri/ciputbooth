import crypto from 'crypto';
import mongoose from 'mongoose';
import { PhotoAccessTokenModel } from '../infrastructure/database/models/PhotoAccessTokenModel.js';
import { SettingsModel } from '../infrastructure/database/models/SettingsModel.js';
import { db } from '../db.js';

class TokenService {
  /**
   * Hashes a raw token with SHA-256 for secure constant-time database storage and lookup.
   */
  hashToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
  }

  /**
   * Generates a unique, high-entropy 256-bit cryptographic token.
   */
  generateRawToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get configured token expiry duration in hours (defaults to 48 hours).
   */
  async getConfiguredExpiryHours() {
    try {
      if (mongoose.connection?.readyState === 1) {
        const settings = await SettingsModel.findOne({ type: 'user' }).lean();
        if (settings?.qrExpiryHours) return Number(settings.qrExpiryHours);
      }
      const localSettings = db.getSettings();
      if (localSettings?.qrExpiryHours) return Number(localSettings.qrExpiryHours);
    } catch (e) {
      console.warn('Could not read qrExpiryHours, falling back to 48 hours:', e.message);
    }
    return 48;
  }

  /**
   * Create and store a new access token for a customer photobooth session.
   */
  async createSessionToken(sessionId, customExpiryHours = null) {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiryHours = customExpiryHours || (await this.getConfiguredExpiryHours());
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000);
    const tokenPreview = rawToken.slice(0, 8);

    const isMongo = Boolean(mongoose.connection?.readyState === 1);

    if (isMongo) {
      try {
        await PhotoAccessTokenModel.create({
          session_id: sessionId,
          token_hash: tokenHash,
          token_preview: tokenPreview,
          expires_at: expiresAt
        });
      } catch (err) {
        console.error('Failed to save PhotoAccessToken to MongoDB:', err);
      }
    }

    // Also persist in local db.json for offline resilience
    try {
      const data = db.load();
      data.tokens = data.tokens || [];
      data.tokens.push({
        session_id: sessionId,
        token_hash: tokenHash,
        token_preview: tokenPreview,
        raw_token: rawToken, // kept only in local dev file
        expires_at: expiresAt.toISOString(),
        revoked_at: null,
        created_at: new Date().toISOString()
      });
      db.save(data);
    } catch (dbErr) {
      console.warn('Could not save token to local database:', dbErr);
    }

    return {
      rawToken,
      tokenHash,
      tokenPreview,
      expiresAt,
      expiryHours
    };
  }

  /**
   * Validate a customer's incoming token.
   */
  async validateToken(rawToken, reqMeta = {}) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'missing' };
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    let tokenDoc = null;

    // 1. Query MongoDB
    if (mongoose.connection?.readyState === 1) {
      try {
        tokenDoc = await PhotoAccessTokenModel.findOne({ token_hash: tokenHash }).lean();
      } catch (err) {
        console.warn('Error querying token from MongoDB:', err.message);
      }
    }

    // 2. Query Local Database fallback
    if (!tokenDoc) {
      try {
        const data = db.load();
        const local = (data.tokens || []).find((t) => (
          t.token_hash === tokenHash ||
          t.raw_token === rawToken ||
          String(t.session_id) === String(rawToken)
        ));
        if (local) {
          tokenDoc = {
            ...local,
            expires_at: new Date(local.expires_at),
            revoked_at: local.revoked_at ? new Date(local.revoked_at) : null
          };
        }
      } catch (e) {
        console.warn('Error reading local token:', e.message);
      }
    }

    // 2b. Backward compatibility: if rawToken is a session ID, auto-resolve or create token
    if (!tokenDoc) {
      try {
        let sessionExists = false;
        let foundSessionId = rawToken;

        // Check if session exists in MongoDB
        if (mongoose.connection?.readyState === 1) {
          const s = await mongoose.model('Transaction').findById(rawToken).lean().catch(() => null);
          if (s) {
            sessionExists = true;
            foundSessionId = String(s._id || s.id);
          }
        }

        // Check if session exists in local database
        if (!sessionExists) {
          const s = db.getSessionById(rawToken);
          if (s) {
            sessionExists = true;
            foundSessionId = String(s.id || s._id);
          }
        }

        if (sessionExists) {
          // Auto-generate fresh token for this existing session
          const newToken = await this.createSessionToken(foundSessionId);
          tokenDoc = {
            session_id: foundSessionId,
            token_hash: newToken.tokenHash,
            raw_token: newToken.rawToken,
            expires_at: newToken.expiresAt,
            revoked_at: null
          };
        }
      } catch (e) {
        console.warn('Error checking session existence in validateToken:', e.message);
      }
    }

    if (!tokenDoc) {
      return { valid: false, reason: 'not_found' };
    }

    // 3. Check Revocation
    if (tokenDoc.revoked_at) {
      return { valid: false, reason: 'revoked', tokenDoc };
    }

    // 4. Check Expiration
    if (new Date(tokenDoc.expires_at) < now) {
      return { valid: false, reason: 'expired', tokenDoc };
    }

    // 5. Update audit access statistics
    if (mongoose.connection?.readyState === 1) {
      PhotoAccessTokenModel.updateOne(
        { token_hash: tokenHash },
        {
          $inc: { access_count: 1 },
          $set: {
            last_accessed_at: now,
            user_agent: reqMeta.userAgent || null,
            ip_address: reqMeta.ip || null
          }
        }
      ).catch(() => {});
    }

    return {
      valid: true,
      session_id: String(tokenDoc.session_id),
      tokenDoc
    };
  }

  /**
   * Revoke an active token (e.g. customer request or security notice).
   * Accepts raw token, token hash, or session ID.
   */
  async revokeToken(rawOrHashOrSessionId) {
    const isSha256 = /^[a-f0-9]{64}$/i.test(rawOrHashOrSessionId);
    const tokenHash = isSha256 ? rawOrHashOrSessionId : this.hashToken(rawOrHashOrSessionId);
    const now = new Date();

    if (mongoose.connection?.readyState === 1) {
      await PhotoAccessTokenModel.updateMany(
        { $or: [{ token_hash: tokenHash }, { session_id: rawOrHashOrSessionId }] },
        { $set: { revoked_at: now } }
      );
    }

    // Also update local db
    try {
      const data = db.load();
      data.tokens = (data.tokens || []).map((t) => {
        if (
          t.token_hash === tokenHash ||
          t.raw_token === rawOrHashOrSessionId ||
          String(t.session_id) === String(rawOrHashOrSessionId)
        ) {
          return { ...t, revoked_at: now.toISOString() };
        }
        return t;
      });
      db.save(data);
    } catch (e) {}

    return true;
  }

  /**
   * Alias for regenerateSessionToken
   */
  async regenerateToken(sessionId, customExpiryHours = null) {
    return this.regenerateSessionToken(sessionId, customExpiryHours);
  }

  /**
   * Revoke all existing tokens for a session and generate a fresh one.
   */
  async regenerateSessionToken(sessionId, customExpiryHours = null) {
    const now = new Date();

    // Revoke previous tokens
    if (mongoose.connection?.readyState === 1) {
      await PhotoAccessTokenModel.updateMany(
        { session_id: sessionId, revoked_at: null },
        { $set: { revoked_at: now } }
      );
    }

    try {
      const data = db.load();
      data.tokens = (data.tokens || []).map((t) => {
        if (String(t.session_id) === String(sessionId) && !t.revoked_at) {
          return { ...t, revoked_at: now.toISOString() };
        }
        return t;
      });
      db.save(data);
    } catch (e) {}

    // Create fresh token
    return await this.createSessionToken(sessionId, customExpiryHours);
  }
}

export const tokenService = new TokenService();
