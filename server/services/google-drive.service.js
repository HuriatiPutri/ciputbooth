import crypto from 'crypto';
import { Readable } from 'stream';

class GoogleDriveService {
  constructor() {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Helper to format PEM private key from string or raw format
   */
  formatPrivateKey(key) {
    if (!key) return '';
    let formatted = String(key).trim();

    // Strip wrapping double or single quotes (often happens when pasting from JSON)
    if (
      (formatted.startsWith('"') && formatted.endsWith('"')) ||
      (formatted.startsWith("'") && formatted.endsWith("'"))
    ) {
      formatted = formatted.slice(1, -1);
    }

    // Replace escaped newlines (e.g. from JSON string or env)
    formatted = formatted.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return formatted.trim();
  }

  /**
   * Generates an OAuth2 access token either via:
   * 1. User OAuth2 Refresh Token (for personal @gmail.com accounts - no 0 byte quota limitation)
   * 2. Service Account JWT (for Google Workspace Shared Drives)
   */
  async getAccessToken(credentials, forceFresh = false) {
    const nowSec = Math.floor(Date.now() / 1000);

    // Reuse valid token if still good for > 5 minutes AND not forcing a fresh test
    if (!forceFresh && this.cachedToken && this.tokenExpiresAt > nowSec + 300) {
      return this.cachedToken;
    }

    // Method A: User OAuth2 Refresh Token (Personal @gmail.com)
    const refreshToken = (credentials?.refresh_token || credentials?.googleDriveRefreshToken || '').trim();
    const clientId = (credentials?.client_id || credentials?.googleDriveClientId || '').trim();
    const clientSecret = (credentials?.client_secret || credentials?.googleDriveClientSecret || '').trim();

    if (refreshToken && clientId && clientSecret) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Google OAuth2 refresh token failed (${tokenRes.status}): ${errText}`);
      }

      const tokenData = await tokenRes.json();
      this.cachedToken = tokenData.access_token;
      this.tokenExpiresAt = nowSec + (tokenData.expires_in || 3600);
      return this.cachedToken;
    }

    // Method B: Service Account RSA-SHA256 JWT
    const clientEmail = (credentials?.client_email || credentials?.googleDriveClientEmail || '').trim();
    const rawPrivateKey = credentials?.private_key || credentials?.googleDrivePrivateKey;

    if (!clientEmail || !rawPrivateKey) {
      throw new Error('Google Drive credentials incomplete: client_email and private_key (atau OAuth2 refresh_token) wajib diisi');
    }

    const privateKey = this.formatPrivateKey(rawPrivateKey);

    // 1. JWT Header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    // 2. JWT Claims - set iat with 30s drift tolerance
    const claims = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: Math.max(0, nowSec - 30)
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedClaims}`;

    // 3. Sign using RSA-SHA256
    let signature;
    try {
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signingInput);
      signer.end();
      signature = signer.sign(privateKey, 'base64url');
    } catch (err) {
      throw new Error(`Format Service Account Private Key tidak valid: ${err.message}. Pastikan menyalin seluruh key termasuk '-----BEGIN PRIVATE KEY-----'`);
    }

    const assertion = `${signingInput}.${signature}`;

    // 4. Request OAuth2 token
    let tokenRes;
    try {
      tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        })
      });
    } catch (netErr) {
      throw new Error(`Gagal menghubungi server Google OAuth2: ${netErr.message}. Periksa koneksi internet.`);
    }

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      let errorDetail = errText;
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.error_description || errJson.error || errText;
      } catch (e) {}

      if (errorDetail.includes('invalid_grant')) {
        throw new Error(`Google OAuth2 invalid_grant: ${errorDetail}. Periksa kembali email Service Account dan jam komputer/laptop.`);
      }
      throw new Error(`Google OAuth2 token exchange failed (${tokenRes.status}): ${errorDetail}`);
    }

    const tokenData = await tokenRes.json();
    this.cachedToken = tokenData.access_token;
    this.tokenExpiresAt = nowSec + (tokenData.expires_in || 3600);

    return this.cachedToken;
  }

  /**
   * Test credentials and verify connection to Google Drive API
   */
  async testConnection(credentials) {
    try {
      const token = await this.getAccessToken(credentials, true);
      const email = (credentials?.client_email || credentials?.googleDriveClientEmail || '').trim();

      // Test drive access using about or files list
      let res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // Fallback to checking files list
        res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)', {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        let errorDetail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          errorDetail = parsed.error?.message || parsed.message || errorText;
        } catch (e) {}

        if (res.status === 403 && errorDetail.includes('has not been used in project')) {
          return {
            success: false,
            error: `Google Drive API belum diaktifkan di Google Cloud Project Anda. Buka Google Cloud Console > APIs & Services > Library > cari 'Google Drive API' dan klik 'Enable'. Detail: ${errorDetail}`
          };
        }

        return { success: false, error: `Drive API returned error (${res.status}): ${errorDetail}` };
      }

      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        user: {
          email: data?.user?.emailAddress || email,
          displayName: data?.user?.displayName || 'Google Service Account'
        },
        quota: data?.storageQuota || null
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Find an existing folder or create it with private permissions
   */
  async getOrCreateFolder(name, parentId = null, credentials = null) {
    const token = await this.getAccessToken(credentials);

    // Search query for folder
    let q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Google Drive folder "${name}": ${err}`);
    }

    const folderData = await createRes.json();
    return folderData.id;
  }

  /**
   * Upload binary buffer to Google Drive with PRIVATE permissions (default).
   */
  async uploadFile({ name, mimeType = 'image/png', buffer, folderId, credentials = null }) {
    if (!buffer || buffer.length === 0) {
      throw new Error(`File buffer for "${name}" is empty`);
    }

    const token = await this.getAccessToken(credentials);

    const boundary = `-------GoogleDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name,
      mimeType,
      parents: folderId ? [folderId] : undefined
    };

    const headerContent = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: binary\r\n\r\n';

    const multipartBody = Buffer.concat([
      Buffer.from(headerContent, 'utf-8'),
      buffer,
      Buffer.from(closeDelimiter, 'utf-8')
    ]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString()
      },
      body: multipartBody
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      if (err.includes('storageQuotaExceeded') || err.includes('do not have storage quota')) {
        throw new Error(`Google Drive kuota 0 byte: Service Account (@...iam.gserviceaccount.com) dibatasi 0 byte oleh Google jika mengunggah ke folder My Drive personal. Solusi: Pindahkan folder ke "Shared Drive / Drive Bersama" Google Workspace dan jadikan Service Account sebagai Member.`);
      }
      throw new Error(`Google Drive upload failed for "${name}" (${uploadRes.status}): ${err}`);
    }

    return await uploadRes.json();
  }

  /**
   * Stream a private file from Google Drive directly through the authorized backend proxy.
   */
  async streamFile(fileId, credentials = null) {
    const token = await this.getAccessToken(credentials);

    // 1. Get file metadata (MIME type, size, filename)
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!metaRes.ok) {
      throw new Error(`File metadata query failed for ID ${fileId}`);
    }
    const metadata = await metaRes.json();

    // 2. Fetch media bytes
    const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!mediaRes.ok) {
      throw new Error(`Drive media stream failed for ID ${fileId} (${mediaRes.status})`);
    }

    // Convert fetch body (Web Stream) to Node.js Readable stream
    const nodeStream = Readable.fromWeb(mediaRes.body);

    return {
      stream: nodeStream,
      metadata
    };
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId, credentials = null) {
    const token = await this.getAccessToken(credentials);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  }
}

export const googleDriveService = new GoogleDriveService();

