/**
 * Centralized Printer Service for Photobooth App.
 * Automatically interfaces with Electron native printing via preload IPC,
 * or gracefully routes via backend API/socket when accessed from remote iPad/web clients.
 */

let isCurrentlyPrinting = false;
let printLockTimeout = null;

export const printerService = {
  isElectron: () => Boolean(window.printerAPI && window.printerAPI.isElectron),

  /**
   * Get available connected printers
   */
  async getPrinters() {
    if (this.isElectron()) {
      try {
        const res = await window.printerAPI.getPrinters();
        return res?.printers || [];
      } catch (err) {
        console.error('Failed to get printers from Electron:', err);
        return [];
      }
    }
    // Remote client fallback
    return [];
  },

  /**
   * Get active printer configuration
   */
  async getConfig() {
    if (this.isElectron()) {
      try {
        const res = await window.printerAPI.getConfig();
        if (res?.success && res.config) {
          return res.config;
        }
      } catch (err) {
        console.warn('Could not read config from Electron IPC:', err);
      }
    }

    // Backend fallback
    try {
      const res = await fetch('/api/printer/config');
      const data = await res.json();
      if (data?.success && data.config) {
        return data.config;
      }
    } catch (err) {
      console.warn('Could not read config from backend API:', err);
    }

    return {
      printerName: '',
      paperSize: '4x6',
      mediaType: 'epson_glossy',
      printQuality: 'high',
      colorMode: 'color',
      orientation: 'portrait',
      borderless: true,
      fitToPaper: 'fill',
      copies: 1
    };
  },

  /**
   * Save printer configuration persistently
   */
  async saveConfig(newConfig, authFetch = null) {
    let electronSaved = null;
    if (this.isElectron()) {
      try {
        const res = await window.printerAPI.saveConfig(newConfig);
        if (res?.success) electronSaved = res.config;
      } catch (err) {
        console.error('Failed to save printer config to Electron:', err);
      }
    }

    // Always sync with backend database settings
    try {
      const fetcher = authFetch || window.fetch;
      await fetcher('/api/printer/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (e) {
      console.warn('Could not sync printer config with backend:', e);
    }

    return electronSaved || newConfig;
  },

  /**
   * Submit a photo to be silently printed automatically.
   * Includes double-click debounce protection.
   */
  async printPhoto({ photoUrl, copies = 1, source = 'customer', overrideConfig = {} }) {
    if (!photoUrl) {
      throw new Error('Photo URL is required for printing');
    }

    // Double-click guard (5 second debounce lockout)
    if (isCurrentlyPrinting) {
      console.warn('Print request ignored: previous print job is still processing');
      return { success: false, duplicate: true, message: 'Print already in progress' };
    }

    isCurrentlyPrinting = true;
    clearTimeout(printLockTimeout);
    printLockTimeout = setTimeout(() => {
      isCurrentlyPrinting = false;
    }, 5000);

    try {
      if (this.isElectron()) {
        const result = await window.printerAPI.printPhoto({
          photoUrl,
          copies,
          source,
          overrideConfig
        });
        return result;
      }

      // Remote web client / iPad fallback: Dispatch to host laptop via API
      const res = await fetch('/api/printer/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, copies, source })
      });
      const data = await res.json();
      return data;
    } finally {
      setTimeout(() => {
        isCurrentlyPrinting = false;
      }, 1500);
    }
  },

  /**
   * Trigger test print pattern to physically verify borderless margin & alignment
   */
  async runTestPrint(config = {}) {
    if (this.isElectron()) {
      return await window.printerAPI.testPrint(config);
    }
    throw new Error('Test print is only supported directly on the Photobooth desktop device');
  },

  /**
   * Preview test print pattern directly without printing
   */
  async previewPattern(config = {}) {
    if (this.isElectron() && typeof window.printerAPI.previewPattern === 'function') {
      const res = await window.printerAPI.previewPattern(config);
      return res?.svgDataUrl || null;
    }
    return null;
  },

  /**
   * Get queue of print jobs
   */
  async getQueue() {
    if (this.isElectron()) {
      const res = await window.printerAPI.getQueue();
      return res?.queue || [];
    }
    return [];
  },

  /**
   * Retry a failed print job
   */
  async retryJob(jobId) {
    if (this.isElectron()) {
      return await window.printerAPI.retryJob(jobId);
    }
    throw new Error('Job retry is only available on the Photobooth desktop device');
  },

  /**
   * Clear stuck jobs and unpause/resume the OS printer queue
   */
  async resumePrinter(printerName) {
    if (this.isElectron() && typeof window.printerAPI.resumePrinter === 'function') {
      return await window.printerAPI.resumePrinter(printerName);
    }
    return { success: false, message: 'Printer resume only supported on desktop' };
  },

  /**
   * Subscribe to real-time print status updates
   */
  onStatusChange(callback) {
    if (this.isElectron() && typeof window.printerAPI.onPrintStatus === 'function') {
      return window.printerAPI.onPrintStatus(callback);
    }
    return () => {};
  }
};

