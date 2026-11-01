import { BrowserWindow, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { loadPrinterConfig } from './printer-config.js';
import { printQueue } from './print-queue.js';
import { getAvailablePrinters } from './printer-manager.js';

// Paper dimensions mapping in microns (1 inch = 25,400 microns; 1 mm = 1,000 microns)
export const PAPER_DIMENSIONS = {
  '4x6': {
    name: '4x6 in (10x15 cm)',
    widthMicrons: 101600,
    heightMicrons: 152400,
    cssWidth: '4in',
    cssHeight: '6in',
    aspectRatio: 4 / 6
  },
  '2x6': {
    name: '2x6 in (Photo Strip)',
    widthMicrons: 50800,
    heightMicrons: 152400,
    cssWidth: '2in',
    cssHeight: '6in',
    aspectRatio: 2 / 6
  },
  '3.5x5': {
    name: '3.5x5 in (3R)',
    widthMicrons: 88900,
    heightMicrons: 127000,
    cssWidth: '3.5in',
    cssHeight: '5in',
    aspectRatio: 3.5 / 5
  },
  '5x7': {
    name: '5x7 in (5R)',
    widthMicrons: 127000,
    heightMicrons: 177800,
    cssWidth: '5in',
    cssHeight: '7in',
    aspectRatio: 5 / 7
  },
  'A4': {
    name: 'A4 (210x297 mm)',
    widthMicrons: 210000,
    heightMicrons: 297000,
    cssWidth: '210mm',
    cssHeight: '297mm',
    aspectRatio: 210 / 297
  }
};

class PrinterService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Submit a photo print job to the queue and trigger processing.
   */
  async submitJob({ photoUrl, copies, source = 'customer', overrideConfig = {} }) {
    if (!photoUrl) {
      throw new Error('Photo URL or data string is required for printing');
    }

    const currentConfig = loadPrinterConfig();
    const mergedConfig = { ...currentConfig, ...overrideConfig };

    const job = printQueue.createJob({
      photoUrl,
      printerName: mergedConfig.printerName,
      config: mergedConfig,
      copies: copies || mergedConfig.copies || 1,
      source
    });

    // Asynchronously process the queue
    this.processQueue().catch((err) => {
      console.error('Queue processing error:', err);
    });

    return job;
  }

  /**
   * Sequentially process all pending jobs in the queue.
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let job = printQueue.getPendingJob();
      while (job) {
        printQueue.updateJob(job.id, { status: 'Printing' });
        try {
          await this.executeJob(job);
          printQueue.updateJob(job.id, { status: 'Completed', error: null });
        } catch (err) {
          console.error(`Print job ${job.id} failed:`, err);
          printQueue.updateJob(job.id, { status: 'Failed', error: err.message || 'Printing failed' });
        }
        job = printQueue.getPendingJob();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute an individual job silently using an offscreen BrowserWindow.
   */
  async executeJob(job) {
    const config = job.config;
    const printers = await getAvailablePrinters();
    const isVirtual = config.printerName === 'Virtual_PDF_Printer' || (!config.printerName && !printers.some(p => !p.isVirtual));

    // Verify printer availability
    if (config.printerName && !isVirtual) {
      const match = printers.find(p => p.name === config.printerName || p.displayName === config.printerName);
      if (!match) {
        throw new Error(`Configured printer "${config.printerName}" is not detected on this system.`);
      }
      if (!match.isConnected) {
        throw new Error(`Printer "${config.printerName}" is offline or reports an error.`);
      }
    }

    const paperKey = config.paperSize || '4x6';
    const paperDim = PAPER_DIMENSIONS[paperKey] || PAPER_DIMENSIONS['4x6'];
    const isLandscape = config.orientation === 'landscape';

    const pageWidthMicrons = isLandscape ? paperDim.heightMicrons : paperDim.widthMicrons;
    const pageHeightMicrons = isLandscape ? paperDim.widthMicrons : paperDim.heightMicrons;
    const cssW = isLandscape ? paperDim.cssHeight : paperDim.cssWidth;
    const cssH = isLandscape ? paperDim.cssWidth : paperDim.cssHeight;

    const printWin = new BrowserWindow({
      show: false,
      width: 1000,
      height: 1400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    try {
      const isBorderless = Boolean(config.borderless);
      const fitMode = config.fitToPaper === 'fit' ? 'contain' : 'cover';

      // Build borderless HTML document
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Silent Print</title>
            <style>
              @page {
                size: ${cssW} ${cssH};
                margin: 0;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: #ffffff;
              }
              .print-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              img {
                width: 100%;
                height: 100%;
                object-fit: ${fitMode};
                display: block;
                image-rendering: -webkit-optimize-contrast;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <img id="print-image" src="${job.photoUrl}" alt="Photo" />
            </div>
          </body>
        </html>
      `;

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // Ensure image is fully loaded before commanding printer
      await printWin.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const img = document.getElementById('print-image');
          if (img && img.complete && img.naturalWidth > 0) {
            resolve(true);
          } else if (img) {
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error('Image failed to render in hidden window'));
            setTimeout(() => resolve(true), 4000);
          } else {
            resolve(true);
          }
        })
      `);

      if (isVirtual) {
        const pdfBuffer = await printWin.webContents.printToPDF({
          landscape: isLandscape,
          margins: {
            marginType: isBorderless ? 'none' : 'default',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          },
          pageSize: {
            width: pageWidthMicrons,
            height: pageHeightMicrons
          },
          printBackground: true
        });

        const outputDir = path.join(app.getPath('downloads'), 'photobooth-prints');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `photobooth_print_${job.id}_${paperKey}.pdf`;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);

        console.log('📄 Saved simulated borderless print to PDF:', filePath);
        shell.openPath(filePath).catch((e) => console.warn('Could not auto-open PDF:', e));

        return {
          success: true,
          isVirtual: true,
          filePath,
          message: `Simulated print saved to Downloads/photobooth-prints/${fileName}`
        };
      }

      // Prepare native Electron silent print options
      const printOptions = {
        silent: true,
        printBackground: true,
        deviceName: config.printerName || undefined,
        color: config.colorMode !== 'monochrome',
        copies: Math.max(1, Number(job.copies || 1)),
        landscape: isLandscape,
        margins: {
          marginType: isBorderless ? 'none' : 'default',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        pageSize: {
          width: pageWidthMicrons,
          height: pageHeightMicrons
        }
      };

      await new Promise((resolve, reject) => {
        printWin.webContents.print(printOptions, (success, failureReason) => {
          if (success) {
            resolve(true);
          } else {
            reject(new Error(failureReason || 'Print failed or was cancelled by the print spooler'));
          }
        });
      });
    } finally {
      setTimeout(() => {
        try {
          if (!printWin.isDestroyed()) {
            printWin.destroy();
          }
        } catch (e) {
          // ignore cleanup errors
        }
      }, 1000);
    }
  }

  /**
   * Generate an SVG-based test print graphic to visually verify borderless alignment.
   */
  generateTestPattern(config) {
    const paperDim = PAPER_DIMENSIONS[config.paperSize || '4x6'] || PAPER_DIMENSIONS['4x6'];
    const w = 1200;
    const h = Math.round(1200 / paperDim.aspectRatio);
    const dateStr = new Date().toLocaleString();

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ec4899;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- Base Background -->
        <rect width="${w}" height="${h}" fill="#ffffff" />
        <rect width="${w}" height="${h}" fill="url(#grid)" opacity="0.6" />

        <!-- Edge Alignment Indicators (Outer Border Line) -->
        <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#ef4444" stroke-width="8" />
        <line x1="0" y1="0" x2="60" y2="60" stroke="#ef4444" stroke-width="4" />
        <line x1="${w}" y1="0" x2="${w - 60}" y2="60" stroke="#ef4444" stroke-width="4" />
        <line x1="0" y1="${h}" x2="60" y2="${h - 60}" stroke="#ef4444" stroke-width="4" />
        <line x1="${w}" y1="${h}" x2="${w - 60}" y2="${h - 60}" stroke="#ef4444" stroke-width="4" />

        <!-- Top Header Banner -->
        <rect x="30" y="30" width="${w - 60}" height="140" rx="20" fill="url(#grad1)" />
        <text x="${w / 2}" y="95" fill="#ffffff" font-family="sans-serif" font-size="36" font-weight="900" text-anchor="middle">
          PHOTOBOOTH PRINTER TEST PRINT
        </text>
        <text x="${w / 2}" y="135" fill="#ffffff" font-family="sans-serif" font-size="20" text-anchor="middle" opacity="0.9">
          EPSON BORDERLESS VERIFICATION
        </text>

        <!-- Configuration Specs Box -->
        <rect x="50" y="210" width="${w - 100}" height="320" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
        
        <text x="80" y="260" fill="#0f172a" font-family="sans-serif" font-size="24" font-weight="bold">
          Active Configuration:
        </text>
        <text x="80" y="305" fill="#334155" font-family="sans-serif" font-size="20">
          • Printer: <tspan font-weight="bold">${config.printerName || 'Default System Printer'}</tspan>
        </text>
        <text x="80" y="345" fill="#334155" font-family="sans-serif" font-size="20">
          • Paper Size: <tspan font-weight="bold">${paperDim.name}</tspan> (${paperDim.cssWidth} x ${paperDim.cssHeight})
        </text>
        <text x="80" y="385" fill="#334155" font-family="sans-serif" font-size="20">
          • Media Type: <tspan font-weight="bold">${config.mediaType || 'Epson Photo Paper'}</tspan>
        </text>
        <text x="80" y="425" fill="#334155" font-family="sans-serif" font-size="20">
          • Quality: <tspan font-weight="bold">${config.printQuality || 'High'}</tspan> | Color: <tspan font-weight="bold">${config.colorMode || 'Color'}</tspan>
        </text>
        <text x="80" y="465" fill="#334155" font-family="sans-serif" font-size="20">
          • Borderless: <tspan font-weight="bold" fill="${config.borderless ? '#16a34a' : '#dc2626'}">${config.borderless ? 'ENABLED (Zero Margin)' : 'DISABLED (Standard Margin)'}</tspan>
        </text>
        <text x="80" y="505" fill="#64748b" font-family="sans-serif" font-size="16">
          Timestamp: ${dateStr}
        </text>

        <!-- Color Check Bars -->
        <rect x="50" y="560" width="${(w - 100) / 6}" height="80" fill="#000000" />
        <rect x="${50 + ((w - 100) / 6) * 1}" y="560" width="${(w - 100) / 6}" height="80" fill="#00ffff" />
        <rect x="${50 + ((w - 100) / 6) * 2}" y="560" width="${(w - 100) / 6}" height="80" fill="#ff00ff" />
        <rect x="${50 + ((w - 100) / 6) * 3}" y="560" width="${(w - 100) / 6}" height="80" fill="#ffff00" />
        <rect x="${50 + ((w - 100) / 6) * 4}" y="560" width="${(w - 100) / 6}" height="80" fill="#22c55e" />
        <rect x="${50 + ((w - 100) / 6) * 5}" y="560" width="${(w - 100) / 6}" height="80" fill="#3b82f6" />

        <!-- Borderless Instruction Notice -->
        <rect x="50" y="${h - 180}" width="${w - 100}" height="140" rx="16" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" />
        <text x="${w / 2}" y="${h - 120}" fill="#1e293b" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">
          ★ Physical Borderless Inspection ★
        </text>
        <text x="${w / 2}" y="${h - 80}" fill="#475569" font-family="sans-serif" font-size="16" text-anchor="middle">
          If borderless is active, the red outer border should extend directly off the edge with 0 white margin.
        </text>
      </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Run a test print using the active configuration.
   */
  async runTestPrint(overrideConfig = {}) {
    const config = { ...loadPrinterConfig(), ...overrideConfig };
    const testPatternUrl = this.generateTestPattern(config);

    return this.submitJob({
      photoUrl: testPatternUrl,
      copies: 1,
      source: 'test',
      overrideConfig: config
    });
  }

  /**
   * Retry a failed print job.
   */
  async retryJob(jobId) {
    const job = printQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job "${jobId}" not found in print queue`);
    }

    printQueue.updateJob(job.id, {
      status: 'Pending',
      error: null
    });

    this.processQueue().catch((err) => {
      console.error('Queue processing error on retry:', err);
    });

    return job;
  }
}

export const printerService = new PrinterService();

