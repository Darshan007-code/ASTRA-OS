const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    frame: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  mainWindow.loadFile('ui/index.html');

  // Use the Python from .venv if it exists
  const venvPath = path.join(__dirname, '.venv/Scripts/python.exe');
  const pythonPath = fs.existsSync(venvPath) ? venvPath : 'python';

  console.log("Using Python path:", pythonPath);

  // Start Python backend
  pythonProcess = spawn(pythonPath, ['python/astra.py'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log("Python Output:", text);
    
    mainWindow.webContents.send('astra-output', text);

    // Image Capture Signal from Python
    if (text.includes("[CAPTURE]")) {
      const imgPath = path.join(__dirname, 'python/face_data/temp.jpg');
      if (fs.existsSync(imgPath)) {
        const base64Img = fs.readFileSync(imgPath, { encoding: 'base64' });
        mainWindow.webContents.send('face-capture', `data:image/jpeg;base64,${base64Img}`);
      }
    }

    // Attempt Messages
    if (text.includes("ATTEMPT FAILED")) {
      const match = text.match(/Attempt (\d+) of 3/);
      if (match) mainWindow.webContents.send('face-attempt', parseInt(match[1]));
    }

    if (text.includes("ASTRA: TELEMETRY")) {
        mainWindow.webContents.send('astra-output', text);
    }

    if (text.includes("ASTRA: NEWS") || text.includes("ASTRA: CRICKET")) {
        mainWindow.webContents.send('astra-output', text);
    }

    if (text.includes("SUCCESSFULLY RECOGNIZED")) {
        mainWindow.webContents.send('astra-state', 'success');
    }

    // State Detection
    if (text.includes("Verifying identity"))
      mainWindow.webContents.send('astra-state', 'face');

    if (text.includes("Security alert"))
      mainWindow.webContents.send('astra-state', 'emergency');

    if (text.includes("System locked"))
      mainWindow.webContents.send('astra-state', 'locked');

    if (text.includes("Say emergency passphrase"))
      mainWindow.webContents.send('astra-state', 'voice-pass');

    if (text.includes("Enter PIN"))
      mainWindow.webContents.send('astra-state', 'pin');

    if (text.includes("Access granted") || text.includes("System online") || text.includes("Welcome Darshan") || text.includes("PIN accepted")) {
      mainWindow.webContents.send('astra-state', 'success');
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error("Python Error:", data.toString());
  });

  // Save frame from Electron to Python's folder
  ipcMain.on('save-frame', (event, base64Data) => {
    const base64Image = base64Data.split(';base64,').pop();
    const savePath = path.join(__dirname, 'python/face_data/temp.jpg');
    
    // Ensure directory exists
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFile(savePath, base64Image, { encoding: 'base64' }, (err) => {
      if (err) console.error("Error saving frame:", err);
    });
  });

  ipcMain.on('submit-pin', (event, pin) => {
    pythonProcess.stdin.write(pin + "\n");
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (pythonProcess) pythonProcess.kill();
    app.quit();
  }
});

app.whenReady().then(createWindow);