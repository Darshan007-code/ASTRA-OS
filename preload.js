const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astra', {
  onOutput: (callback) => ipcRenderer.on('astra-output', (_, data) => callback(data)),
  onState: (callback) => ipcRenderer.on('astra-state', (_, state) => callback(state)),
  onFaceAttempt: (callback) => ipcRenderer.on('face-attempt', (_, count) => callback(count)),
  onFaceCapture: (callback) => ipcRenderer.on('face-capture', (_, base64) => callback(base64)),
  sendPin: (pin) => ipcRenderer.send('submit-pin', pin),
  saveFrame: (base64) => ipcRenderer.send('save-frame', base64)
});