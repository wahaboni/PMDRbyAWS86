const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  toggleMiniMode: (isMini) => ipcRenderer.send('toggle-mini-mode', isMini),
  sendNotification: (title, body) => {
    new Notification(title, { body: body });
  }
});
