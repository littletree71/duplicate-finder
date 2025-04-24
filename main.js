const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

app.disableHardwareAcceleration();

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

ipcMain.handle('select-folders', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] });
  return result.filePaths;
});

function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

ipcMain.handle('find-duplicates', async (event, config) => {
  const { folders, useDate, useHash, extFilter, useSize } = config;
  const fileMap = new Map();
  const duplicates = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extFilter.length > 0 && !extFilter.includes(ext)) continue;

        const stats = fs.statSync(fullPath);
        const hash = useHash ? getFileHash(fullPath) : '';
        const date = useDate ? stats.mtimeMs : '';
        const size = useSize ? stats.size : 0;
        const key = `${entry.name}_${size}_${hash}_${date}`;

        if (fileMap.has(key)) {
          fileMap.get(key).push(fullPath);
        } else {
          fileMap.set(key, [fullPath]);
        }
      }
    }
  }

  folders.forEach(walk);

  for (const [key, files] of fileMap.entries()) {
    if (files.length > 1) {
      duplicates.push({ key, files });
    }
  }

  return duplicates;
});