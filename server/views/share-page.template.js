/**
 * Generates the responsive HTML page for mobile users downloading their softcopy
 */
export function renderSharePage(session) {
  const imageUrl = session.composite_url;
  const photos = Array.isArray(session.photos) ? session.photos : [];

  const rawPhotosHtml = photos.length > 0 ? `
    <div class="section-title">
      <h3>📷 Individual Camera Shots (${photos.length})</h3>
      <p>Original high-resolution photos taken in the booth</p>
    </div>
    <div class="shots-grid">
      ${photos.map((photoUrl, idx) => `
        <div class="shot-card">
          <div class="shot-img-wrap">
            <img src="${photoUrl}" alt="Shot ${idx + 1}" class="shot-img" />
            <span class="shot-tag">#${idx + 1}</span>
          </div>
          <a href="${photoUrl}" download="ciputbooth-${session.id}-shot-${idx + 1}.png" class="btn-shot-download">
            ⬇️ Shot #${idx + 1}
          </a>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CIPUTBOOTH - Digital Photos</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body { background: #020617; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 24px 16px; }
      .container { max-width: 480px; width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 28px; padding: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); margin-bottom: 24px; }
      .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px; }
      h1 { font-size: 26px; font-weight: 900; background: linear-gradient(to right, #c084fc, #f472b6, #fde047); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
      p.subtitle { font-size: 13px; color: #94a3b8; margin-bottom: 18px; }
      .image-wrap { background: #020617; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 12px; margin-bottom: 16px; max-height: 52vh; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      img.photo { max-width: 100%; max-height: 48vh; object-fit: contain; border-radius: 12px; }
      .btn-download { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; text-decoration: none; border-radius: 18px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.4); transition: transform 0.2s; cursor: pointer; border: none; }
      .btn-download:active { transform: scale(0.98); }
      .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 14px; margin-top: 10px; cursor: pointer; transition: background 0.2s; }
      .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
      .hint { font-size: 11px; color: #64748b; margin-top: 14px; line-height: 1.5; }

      .section-title { text-align: left; margin-top: 28px; margin-bottom: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
      .section-title h3 { font-size: 16px; font-weight: 800; color: #f1f5f9; }
      .section-title p { font-size: 12px; color: #94a3b8; margin-top: 2px; }
      .shots-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
      .shot-card { background: #020617; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
      .shot-img-wrap { position: relative; width: 100%; aspect-ratio: 4/3; border-radius: 10px; overflow: hidden; background: #1e293b; }
      .shot-img { width: 100%; height: 100%; object-fit: cover; }
      .shot-tag { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); color: #ec4899; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 6px; }
      .btn-shot-download { display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #e2e8f0; font-size: 12px; font-weight: 700; text-decoration: none; transition: background 0.2s; }
      .btn-shot-download:hover { background: rgba(255,255,255,0.15); color: #fff; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="badge">📸 Softcopy Ready</div>
      <h1>CIPUTBOOTH</h1>
      <p class="subtitle">Thank you for snapping memories with us!</p>
      
      <!-- Main Framed Strip -->
      <div class="image-wrap">
        <img src="${imageUrl}" alt="Photo Strip" class="photo" />
      </div>

      <a href="${imageUrl}" download="ciputbooth-${session.id}-framed.png" class="btn-download">
        ⬇️ Download Framed Photo Strip
      </a>

      ${photos.length > 0 ? `
        <button onclick="downloadAllPhotos()" class="btn-secondary">
          📦 Download All Photos (${photos.length + 1} Files)
        </button>
      ` : ''}
      
      <!-- Individual Camera Shots -->
      ${rawPhotosHtml}

      <p class="hint">💡 Tip: You can tap & hold any photo and select <strong>Save to Photos</strong>.</p>
    </div>

    <script>
      function downloadAllPhotos() {
        const urls = [
          { url: '${imageUrl}', name: 'ciputbooth-${session.id}-framed.png' },
          ${photos.map((p, idx) => `{ url: '${p}', name: 'ciputbooth-${session.id}-shot-${idx + 1}.png' }`).join(',\n          ')}
        ];

        urls.forEach((item, index) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = item.url;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, index * 400);
        });
      }
    </script>
  </body>
</html>`;
}

export function renderNotFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Not Found - CIPUTBOOTH</title>
    <style>
      body { font-family: -apple-system, sans-serif; background: #020617; color: #fff; text-align: center; padding: 60px 20px; }
      h1 { color: #f43f5e; font-size: 24px; margin-bottom: 8px; }
      p { color: #94a3b8; font-size: 14px; }
    </style>
  </head>
  <body>
    <h1>Photo Not Found</h1>
    <p>This photo session may have expired or was removed from the booth.</p>
  </body>
</html>`;
}
