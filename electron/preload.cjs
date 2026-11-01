const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, validated printer API to the renderer process
contextBridge.exposeInMainWorld('printerAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('printer:list'),
  getConfig: () => ipcRenderer.invoke('printer:get-config'),
  saveConfig: (config) => ipcRenderer.invoke('printer:save-config', config),
  printPhoto: (jobData) => ipcRenderer.invoke('printer:print', jobData),
  testPrint: (config) => ipcRenderer.invoke('printer:test-print', config),
  previewPattern: (config) => ipcRenderer.invoke('printer:preview-pattern', config),
  getQueue: () => ipcRenderer.invoke('printer:get-queue'),
  retryJob: (jobId) => ipcRenderer.invoke('printer:retry-job', jobId),
  onPrintStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('printer:status', subscription);
    return () => {
      ipcRenderer.removeListener('printer:status', subscription);
    };
  }
});

