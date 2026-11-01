import { BrowserWindow } from 'electron';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Detect all printers available to Electron and enrich them with details.
 */
export async function getAvailablePrinters(windowInstance) {
  let printers = [];

  try {
    const win = windowInstance || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win && win.webContents) {
      printers = await win.webContents.getPrintersAsync();
    }
  } catch (err) {
    console.error('Failed to query printers via webContents:', err);
  }

  // Also query OS-level CUPS or PowerShell for offline/idle status and Epson options when possible
  const osPrinterInfo = await getOSPrinterDetails().catch(() => ({}));

  const detected = printers.map((p) => {
    const isEpson = /epson/i.test(p.name) || /epson/i.test(p.displayName || '') || /epson/i.test(p.description || '');
    const osInfo = osPrinterInfo[p.name] || {};

    // Chromium status: 0 = idle/ready, 1 = printing, 2 = stopped/offline, 3 = error
    let statusText = 'Connected';
    let isConnected = true;

    if (p.status === 2 || osInfo.status === 'offline' || osInfo.status === 'stopped') {
      statusText = 'Offline';
      isConnected = false;
    } else if (p.status === 3 || osInfo.status === 'error') {
      statusText = 'Error';
      isConnected = false;
    } else if (p.status === 1) {
      statusText = 'Busy';
    } else {
      statusText = 'Connected';
    }

    return {
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || '',
      isDefault: Boolean(p.isDefault),
      isEpson,
      isVirtual: false,
      status: p.status,
      statusText,
      isConnected,
      driverFeatures: osInfo.features || null
    };
  });

  // Always append Virtual PDF Simulation Printer for testing without hardware
  detected.push({
    name: 'Virtual_PDF_Printer',
    displayName: 'Virtual Printer (Save to PDF / Simulation Mode)',
    description: 'Generates and opens borderless PDF simulation in Downloads folder',
    isDefault: detected.length === 0,
    isEpson: false,
    isVirtual: true,
    status: 0,
    statusText: 'Ready (Virtual)',
    isConnected: true,
    driverFeatures: null
  });

  return detected;
}

/**
 * Query OS-level printer info (macOS/Linux CUPS or Windows spooler)
 */
async function getOSPrinterDetails() {
  const result = {};
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  if (isMac || process.platform === 'linux') {
    try {
      const { stdout } = await execPromise('lpstat -p -d 2>/dev/null || true');
      const lines = stdout.split('\n');
      for (const line of lines) {
        // e.g. "printer EPSON_L8050 is idle. enabled since..." or "printer EPSON_L8050 disabled since..."
        const match = line.match(/^printer\s+([^\s]+)\s+(is idle|is printing|disabled)/);
        if (match) {
          const printerName = match[1];
          const state = match[2];
          result[printerName] = {
            status: state.includes('disabled') ? 'offline' : 'ready'
          };
        }
      }
    } catch (e) {
      // Ignore if lpstat fails
    }
  } else if (isWin) {
    try {
      const { stdout } = await execPromise(
        'powershell -NoProfile -Command "Get-Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json"'
      );
      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const p of list) {
        if (p && p.Name) {
          result[p.Name] = {
            status: p.PrinterStatus === 'Normal' ? 'ready' : 'offline',
            port: p.PortName
          };
        }
      }
    } catch (e) {
      // Ignore PowerShell errors
    }
  }

  return result;
}

