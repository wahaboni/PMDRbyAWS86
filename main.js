const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    resizable: false,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // IPC Handlers
  ipcMain.on('window-close', () => {
    app.quit();
  });

  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('set-always-on-top', (event, flag) => {
    mainWindow.setAlwaysOnTop(flag);
  });

  ipcMain.on('toggle-mini-mode', (event, isMini) => {
    if (isMini) {
      mainWindow.setSize(280, 110);
    } else {
      mainWindow.setSize(400, 700);
    }
    mainWindow.center();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Create Tray Icon (conditional)
  const fs = require('fs');
  const iconPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('Pomodoro Timer');
    tray.setContextMenu(contextMenu);
  }
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
