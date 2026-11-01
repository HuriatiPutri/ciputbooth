import { ipcMain } from 'electron';
import { getAvailablePrinters } from './printer-manager.js';
import { loadPrinterConfig, savePrinterConfig } from './printer-config.js';
import { printQueue } from './print-queue.js';
import { printerService } from './printer-service.js';

let isRegistered = false;

export function registerPrinterIPC(mainWindow) {
  if (isRegistered) return;
  isRegistered = true;

  // Broadcast queue status changes to the renderer window
  printQueue.addStatusListener((job) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('printer:status', job);
      }
    } catch (err) {
      console.warn('Failed to send printer:status event to renderer:', err);
    }
  });

  // Handler: List available printers
  ipcMain.handle('printer:list', async () => {
    try {
      const printers = await getAvailablePrinters(mainWindow);
      return { success: true, printers };
    } catch (err) {
      console.error('IPC printer:list error:', err);
      return { success: false, error: err.message, printers: [] };
    }
  });

  // Handler: Get persistent configuration
  ipcMain.handle('printer:get-config', async () => {
    try {
      const config = loadPrinterConfig();
      return { success: true, config };
    } catch (err) {
      console.error('IPC printer:get-config error:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler: Save persistent configuration
  ipcMain.handle('printer:save-config', async (_event, newConfig) => {
    try {
      // Validate configuration payload
      if (!newConfig || typeof newConfig !== 'object') {
        throw new Error('Invalid configuration payload');
      }
      const saved = savePrinterConfig(newConfig);
      return { success: true, config: saved };
    } catch (err) {
      console.error('IPC printer:save-config error:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler: Submit print job
  ipcMain.handle('printer:print', async (_event, payload) => {
    try {
      if (!payload || !payload.photoUrl) {
        throw new Error('Missing photoUrl in print request');
      }

      const job = await printerService.submitJob({
        photoUrl: payload.photoUrl,
        copies: payload.copies,
        source: payload.source || 'customer',
        overrideConfig: payload.overrideConfig
      });

      return { success: true, job };
    } catch (err) {
      console.error('IPC printer:print error:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler: Test print
  ipcMain.handle('printer:test-print', async (_event, config) => {
    try {
      const job = await printerService.runTestPrint(config || {});
      return { success: true, job };
    } catch (err) {
      console.error('IPC printer:test-print error:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler: Preview Test Print Pattern
  ipcMain.handle('printer:preview-pattern', async (_event, config) => {
    try {
      const merged = { ...loadPrinterConfig(), ...(config || {}) };
      const svgDataUrl = printerService.generateTestPattern(merged);
      return { success: true, svgDataUrl };
    } catch (err) {
      console.error('IPC printer:preview-pattern error:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler: Get print queue history
  ipcMain.handle('printer:get-queue', async () => {
    try {
      const queue = printQueue.getJobs();
      return { success: true, queue };
    } catch (err) {
      console.error('IPC printer:get-queue error:', err);
      return { success: false, error: err.message, queue: [] };
    }
  });

  // Handler: Retry failed job
  ipcMain.handle('printer:retry-job', async (_event, jobId) => {
    try {
      if (!jobId) throw new Error('Missing jobId');
      const job = await printerService.retryJob(jobId);
      return { success: true, job };
    } catch (err) {
      console.error('IPC printer:retry-job error:', err);
      return { success: false, error: err.message };
    }
  });
}

