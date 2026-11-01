/**
 * Secure Customer Photo Sharing Page (Mobile Responsive, Dark Mode)
 * Serves media exclusively through authorized proxy endpoints with zero credential exposure.
 */
export function renderSharePage(session, tokenDoc, token) {
  const hasComposite = Boolean(session.composite_url || session.photo_url);
  const hasLive = Boolean(session.live_photo_url);
  const hasGif = Boolean(session.gif_url);
  const photos = Array.isArray(session.photos) ? session.photos : [];
  const liveClips = Array.isArray(session.live_clips) ? session.live_clips : [];

  // Expiration calculation
  let expiryText = 'Valid session';
  if (tokenDoc?.expires_at) {
    const diffMs = new Date(tokenDoc.expires_at) - new Date();
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) {
      expiryText = `Link expires in ~${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      expiryText = `Link expires in ~${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  }

  const isDriveSynced = session.drive_upload_status === 'success';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Your Photobooth Memories • Private Gallery</title>
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
      body {
        background: #090b10;
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 14px 40px;
      }
      .container {
        max-width: 480px;
        width: 100%;
        background: rgba(18, 24, 38, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 32px;
        padding: 24px 20px;
        text-align: center;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8);
      }
      .header-badges {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .badge-security {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 9999px;
      }
      .badge-expiry {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.35);
        color: #fbbf24;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 9999px;
      }
      h1 {
        font-size: 26px;
        font-weight: 900;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #c084fc 0%, #ec4899 50%, #fde047 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 4px;
      }
      p.subtitle {
        font-size: 13px;
        color: #94a3b8;
        margin-bottom: 22px;
      }
      .media-frame {
        background: #020617;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
      }
      img.composite-photo, video.composite-video {
        width: 100%;
        max-height: 55vh;
        object-fit: contain;
        border-radius: 16px;
        display: block;
      }
      .btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 20px;
        font-weight: 900;
        font-size: 15px;
        letter-spacing: 0.01em;
        box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.45);
        transition: transform 0.2s, box-shadow 0.2s;
        border: none;
        cursor: pointer;
      }
      .btn-primary:active { transform: scale(0.98); }
      .btn-zip {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 14px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e2e8f0;
        text-decoration: none;
        border-radius: 18px;
        font-weight: 800;
        font-size: 13px;
        margin-top: 10px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-zip:active { background: rgba(255, 255, 255, 0.15); }
      .section-header {
        text-align: left;
        margin-top: 28px;
        margin-bottom: 12px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .section-header h3 {
        font-size: 15px;
        font-weight: 800;
        color: #f1f5f9;
      }
      .section-header p {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }
      .grid-shots {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }
      .card-shot {
        background: #0b0f19;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .wrap-shot-img {
        position: relative;
        width: 100%;
        aspect-ratio: 4/3;
        border-radius: 12px;
        overflow: hidden;
        background: #1e293b;
      }
      .wrap-shot-img img, .wrap-shot-img video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .tag-shot {
        position: absolute;
        top: 6px;
        left: 6px;
        background: rgba(0, 0, 0, 0.75);
        color: #f472b6;
        font-size: 10px;
        font-weight: 900;
        padding: 2px 7px;
        border-radius: 6px;
        backdrop-filter: blur(4px);
      }
      .btn-mini-download {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: #f1f5f9;
        font-size: 11px;
        font-weight: 700;
        text-decoration: none;
      }
      .btn-mini-download:active { background: rgba(255, 255, 255, 0.2); }
      .footer-note {
        margin-top: 24px;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-badges">
        <span class="badge-security">🔒 Private & Secure</span>
        <span class="badge-expiry">⏳ ${expiryText}</span>
        ${isDriveSynced ? '<span class="badge-security" style="color: #60a5fa; border-color: rgba(96, 165, 250, 0.4); background: rgba(96, 165, 250, 0.1);">☁️ Google Drive</span>' : ''}
      </div>

      <h1>PHOTOBOOTH</h1>
      <p class="subtitle">Your private digital memories are ready to save!</p>

      <!-- Main Photo Strip / Postcard -->
      ${hasComposite ? `
        <div class="media-frame">
          <img
            src="/api/share/${token}/stream/composite"
            alt="Photobooth Strip"
            class="composite-photo"
            loading="eager"
          />
        </div>
        <a href="/api/share/${token}/download/composite" class="btn-primary">
          <span>⬇️ Download Photo Strip (HD)</span>
        </a>
      ` : ''}

      <!-- Live Motion Picture (if available) -->
      ${hasLive ? `
        <div class="section-header">
          <h3>✨ Live Motion Video</h3>
          <p>Recorded video clip with moving photo memories</p>
        </div>
        <div class="media-frame" style="margin-top: 10px;">
          <video
            src="/api/share/${token}/stream/live"
            autoplay
            loop
            muted
            playsinline
            controls
            class="composite-video"
          ></video>
        </div>
        <a href="/api/share/${token}/download/live" class="btn-primary" style="background: linear-gradient(135deg, #ec4899, #8b5cf6);">
          <span>🎬 Download Live Motion Clip</span>
        </a>
      ` : ''}

      <!-- Individual Raw Camera Shots -->
      ${photos.length > 0 ? `
        <div class="section-header">
          <h3>📷 Individual Camera Shots (${photos.length})</h3>
          <p>Original full-resolution camera poses</p>
        </div>
        <div class="grid-shots">
          ${photos.map((_, idx) => `
            <div class="card-shot">
              <div class="wrap-shot-img">
                <img
                  src="/api/share/${token}/stream/shot/${idx}"
                  alt="Camera Shot ${idx + 1}"
                  loading="lazy"
                />
                <span class="tag-shot">#${idx + 1}</span>
              </div>
              <a href="/api/share/${token}/download/shot/${idx}" class="btn-mini-download">
                ⬇️ Shot #${idx + 1}
              </a>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Download All in One ZIP -->
      <a href="/api/share/${token}/download-all" class="btn-zip">
        <span>📦 Download All Photos (ZIP Archive)</span>
      </a>

      <p class="footer-note">
        🔒 This page is encrypted and private to your session.<br />
        To protect your privacy, this download link will automatically expire.
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Clean, branded security notice page shown when a token is expired, revoked, or invalid
 */
export function renderSecurityNoticePage(reason = 'not_found') {
  let title = 'Private Session Not Available';
  let badge = '🔒 Access Notice';
  let desc = 'The photo link you followed is not available or could not be found.';
  let icon = '🔒';

  if (reason === 'expired') {
    title = 'Photo Link Expired';
    badge = '⏳ Link Expired';
    icon = '⌛';
    desc = 'For your privacy and security, this photobooth download link has expired. Please contact the event administrator if you still need to retrieve your photos.';
  } else if (reason === 'revoked') {
    title = 'Access Has Been Revoked';
    badge = '🚫 Link Disabled';
    icon = '🚫';
    desc = 'This download link has been disabled or replaced with a new QR code by the administrator.';
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} • Photobooth Security</title>
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body {
        background: #090b10;
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        max-width: 420px;
        width: 100%;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 28px;
        padding: 36px 24px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.7);
      }
      .icon-circle {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        margin: 0 auto 16px;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        background: rgba(244, 63, 94, 0.15);
        color: #fb7185;
        border: 1px solid rgba(244, 63, 94, 0.3);
        margin-bottom: 12px;
      }
      h2 { font-size: 20px; font-weight: 900; color: #ffffff; margin-bottom: 8px; }
      p { font-size: 13px; color: #94a3b8; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon-circle">${icon}</div>
      <span class="badge">${badge}</span>
      <h2>${title}</h2>
      <p>${desc}</p>
    </div>
  </body>
</html>`;
}

export function renderNotFoundPage() {
  return renderSecurityNoticePage('not_found');
}
