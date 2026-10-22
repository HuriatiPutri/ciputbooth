import { app, BrowserWindow } from 'electron';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

// Allow Electron to load self-signed certificates
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

const isDev = process.env.NODE_ENV === 'development';
const SERVER_PORT = 37192;

async function startBackendServer() {
  process.env.PORT = SERVER_PORT.toString();
  console.log(`Starting backend server internally...`);
  try {
    // Run the Express server in the same process
    await import('../server/index.js');
    console.log('Backend server started successfully.');
  } catch (err) {
    console.error('Failed to start backend server:', err);
  }
}

function waitForServer(port, callback) {
  let retries = 0;
  let hasConnected = false;

  const tryConnect = () => {
    if (hasConnected) return;

    const client = new net.Socket();
    client.setTimeout(1000);

    client.connect({ port, host: '127.0.0.1' }, () => {
      if (!hasConnected) {
        hasConnected = true;
        client.destroy();
        console.log('Backend server is ready!');
        callback();
      }
    });

    client.on('error', () => {
      client.destroy();
      retries++;
      if (retries > 30) {
        console.error('Failed to connect to backend server after 30 seconds');
        if (!hasConnected) {
          hasConnected = true;
          callback();
        }
        return;
      }
      setTimeout(tryConnect, 1000);
    });

    client.on('timeout', () => {
      client.destroy();
    });
  };

  tryConnect();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: !isDev,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, the backend serves the built Vite app
    const prodUrl = `https://localhost:${SERVER_PORT}`;
    mainWindow.loadURL(prodUrl);

    // If initial load failed because server took a moment longer to accept TLS connections, retry
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.warn(`Failed to load ${prodUrl} (${errorCode}: ${errorDescription}), retrying in 1s...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(prodUrl);
        }
      }, 1000);
    });
  }
}

app.whenReady().then(() => {
  if (!isDev) {
    startBackendServer();
    waitForServer(SERVER_PORT, () => {
      createWindow();
    });
  } else {
    // In development, npm run dev handles starting the backend (port 3001) and frontend (port 5174)
    createWindow();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Cleanup if needed
});
