import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const DEFAULT_CONFIG = {
  printerName: '',
  paperSize: '4x6', // '4x6', '2x6', '3.5x5', '5x7', 'A4'
  mediaType: 'epson_glossy', // 'epson_premium_glossy', 'epson_glossy', 'epson_matte', 'plain_paper'
  printQuality: 'high', // 'high', 'standard', 'draft'
  colorMode: 'color', // 'color', 'monochrome'
  orientation: 'portrait', // 'portrait', 'landscape'
  borderless: true,
  fitToPaper: 'fill', // 'fill', 'fit'
  copies: 1
};

function getConfigPath() {
  try {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'printer-config.json');
  } catch (err) {
    // Fallback if app is not ready
    return path.join(process.cwd(), 'printer-config.json');
  }
}

export function loadPrinterConfig() {
  const filePath = getConfigPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Failed to read printer configuration file:', err);
  }
  return { ...DEFAULT_CONFIG };
}

export function savePrinterConfig(newConfig) {
  const filePath = getConfigPath();
  try {
    const current = loadPrinterConfig();
    const updated = {
      ...current,
      ...newConfig
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to write printer configuration file:', err);
    throw new Error('Could not persist printer configuration: ' + err.message);
  }
}

