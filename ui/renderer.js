// ASTRA OS - RENDERER CORE
const isWeb = !window.astra;
const astra = window.astra || {
    onOutput: () => {},
    onState: () => {},
    onFaceAttempt: () => {},
    onFaceCapture: () => {},
    sendPin: () => {},
    saveFrame: () => {}
};

const { onOutput, onState, onFaceAttempt, onFaceCapture, sendPin, saveFrame } = astra;

// UI Elements - Screens
const bootScreen = document.getElementById('bootScreen');
const securityLayer = document.getElementById('securityLayer');
const astraHUD = document.getElementById('astraHUD');

// ... (rest of element selections)

// ---------------- BOOT SEQUENCE ----------------
if (isWeb) {
    // WEB DEPLOYMENT: SKIP BOOT & SECURITY
    bootScreen.classList.add('hidden');
    securityLayer.classList.add('hidden');
    astraHUD.classList.remove('hidden');
    initializeHUD();
    
    // Fill dummy data for web preview
    document.getElementById('cpuUsage').innerText = "12%";
    document.getElementById('ramUsage').innerText = "45%";
    document.getElementById('diskUsage').innerText = "28%";
    document.getElementById('astraResponse').innerText = "WEB PREVIEW MODE: OFFLINE";
    updateCommandLog("SYSTEM", "Astra-OS Web Interface Loaded.");
} else {
    setTimeout(() => {
        bootScreen.style.opacity = '0';
        setTimeout(() => {
            bootScreen.classList.add('hidden');
            securityLayer.classList.remove('hidden');
            
            // AUTO-START CAMERA ON BOOT
            console.log("BOOT COMPLETE: INITIALIZING CAMERA");
            startCamera();
        }, 500);
    }, 4500);
}

// ---------------- CAMERA & FRAME CAPTURE ----------------
function startCamera() {
    if (cameraStream) return;
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            console.log("CAMERA ACCESS GRANTED");
            cameraStream = stream;
            cameraFeed.srcObject = stream;
            
            // Start sending frames to main process
            startFrameCapture();
        })
        .catch(err => {
            console.error("Camera access denied:", err);
            faceStatus.innerText = "CAMERA ACCESS DENIED";
        });
}

function startFrameCapture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (frameCaptureInterval) clearInterval(frameCaptureInterval);

    frameCaptureInterval = setInterval(() => {
        if (!cameraStream) return;
        
        canvas.width = cameraFeed.videoWidth || 640;
        canvas.height = cameraFeed.videoHeight || 480;
        
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        saveFrame(dataUrl);
    }, 1000); 
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    if (frameCaptureInterval) {
        clearInterval(frameCaptureInterval);
        frameCaptureInterval = null;
    }
}

// ---------------- STATE MANAGEMENT ----------------
onState((state) => {
    console.log("ASTRA STATE RECEIVED:", state);
    
    // Clear alerts
    document.body.classList.remove('emergency-alert');

    // Ensure camera is on if we are in security screens
    if (state === 'face' || state === 'emergency') {
        startCamera();
    }

    [faceScan, voiceAuth, pinAuth, lockScreen].forEach(box => box.classList.add('hidden'));

    switch(state) {
        case 'face':
            securityLayer.classList.remove('hidden');
            faceScan.classList.remove('hidden');
            if (faceStatus.innerText !== "SUCCESSFULLY RECOGNIZED") {
                faceStatus.innerText = "VERIFYING IDENTITY...";
                faceStatus.className = "";
            }
            break;

        case 'emergency':
            securityLayer.classList.remove('hidden');
            faceScan.classList.remove('hidden');
            faceStatus.innerText = "EMERGENCY ALERT";
            faceStatus.className = "red-glow";
            document.body.classList.add('emergency-alert');
            break;

        case 'locked':
            securityLayer.classList.remove('hidden');
            lockScreen.classList.remove('hidden');
            startLockCountdown(30);
            break;

        case 'voice-pass':
            securityLayer.classList.remove('hidden');
            voiceAuth.classList.remove('hidden');
            break;

        case 'pin':
            securityLayer.classList.remove('hidden');
            pinAuth.classList.remove('hidden');
            document.getElementById('pinInput').focus();
            break;

        case 'success':
            faceStatus.innerText = "SUCCESSFULLY RECOGNIZED";
            faceStatus.className = "success-glow";
            setTimeout(() => {
                securityLayer.classList.add('hidden');
                astraHUD.classList.remove('hidden');
                stopCamera();
                initializeHUD();
            }, 1500);
            break;
    }
});

onFaceCapture((base64) => {
    console.log("UI: ANALYZING FRAME...");
    freezeFrame.src = base64;
    freezeFrame.classList.remove('hidden');
    setTimeout(() => { freezeFrame.classList.add('hidden'); }, 1200);
});

onFaceAttempt((count) => {
    console.log("UI: FACE ATTEMPT FAILED", count);
    faceAttempts.innerText = `ATTEMPTS: ${count} / 3`;
    faceStatus.innerText = "ATTEMPT FAILED";
    faceStatus.className = "red-glow";
    
    if (count < 3) {
        setTimeout(() => {
            if (!faceScan.classList.contains('hidden') && faceStatus.innerText !== "SUCCESSFULLY RECOGNIZED") {
                faceStatus.innerText = "VERIFYING IDENTITY...";
                faceStatus.className = "";
            }
        }, 2500);
    }
});

// ---------------- OUTPUT PARSING ----------------
onOutput((text) => {
    // TELEMETRY PARSING
    if (text.includes("ASTRA: TELEMETRY")) {
        const cpu = text.match(/CPU:([\d.]+)/);
        const ram = text.match(/RAM:([\d.]+)/);
        const disk = text.match(/DISK:([\d.]+)/);
        
        if (cpu) cpuUsage.innerText = Math.round(parseFloat(cpu[1])) + "%";
        if (ram) ramUsage.innerText = Math.round(parseFloat(ram[1])) + "%";
        if (disk) diskUsage.innerText = Math.round(parseFloat(disk[1])) + "%";
        return;
    }

    // NEWS TICKER
    if (text.includes("ASTRA: NEWS")) {
        const news = text.split("ASTRA: NEWS")[1].trim();
        document.getElementById('newsTicker').innerText = "FEEDS: " + news;
        return;
    }

    // CRICKET TICKER
    if (text.includes("ASTRA: CRICKET")) {
        const score = text.split("ASTRA: CRICKET")[1].strip();
        document.getElementById('cricketTicker').innerText = "SPORTS: " + score;

        // Update User Preferences sidebar with score
        const userPrefs = document.getElementById('userPrefs');
        let scoreItem = document.getElementById('sidebarScore');
        if (!scoreItem) {
            scoreItem = document.createElement('div');
            scoreItem.id = 'sidebarScore';
            scoreItem.className = 'pref-item';
            scoreItem.style.color = '#ffaa00';
            scoreItem.style.marginTop = '20px';
            scoreItem.style.borderTop = '1px solid rgba(255, 170, 0, 0.3)';
            scoreItem.style.paddingTop = '10px';
            userPrefs.appendChild(scoreItem);
        }
        scoreItem.innerHTML = `<strong>LIVE SCORE:</strong><br>${score}`;
        return;
    }


    if (text.includes("ASTRA:")) {
        const msg = text.split("ASTRA:")[1].trim();
        
        // Don't show technical state changes in the main HUD response
        if (!["Verifying identity", "Security alert", "System locked", "SUCCESSFULLY RECOGNIZED", "ATTEMPT FAILED"].some(s => msg.includes(s))) {
            astraResponse.innerText = msg;
            updateCommandLog("ASTRA", msg);
        }
        
        parseSystemStats(msg);
        
        micIndicator.classList.add('mic-on');
        micIndicator.classList.remove('mic-off');
        setTimeout(() => {
            micIndicator.classList.remove('mic-on');
            micIndicator.classList.add('mic-off');
        }, 3000);
    }

    if (text.includes("You:")) {
        const msg = text.split("You:")[1].trim();
        updateCommandLog("USER", msg);
    }
});

function updateCommandLog(sender, msg) {
    const div = document.createElement('div');
    div.style.marginBottom = "10px";
    div.style.color = sender === "ASTRA" ? "var(--primary-cyan)" : "#fff";
    div.innerHTML = `<span style="opacity:0.5">[${new Date().toLocaleTimeString()}]</span> <strong>${sender}:</strong> ${msg}`;
    commandLog.prepend(div);
}

function parseSystemStats(text) {
    const cpuMatch = text.match(/CPU usage is (\d+)/i);
    const ramMatch = text.match(/RAM usage is (\d+)/i);
    const diskMatch = text.match(/Disk usage is (\d+)/i);
    if (cpuMatch) cpuUsage.innerText = cpuMatch[1] + "%";
    if (ramMatch) ramUsage.innerText = ramMatch[1] + "%";
    if (diskMatch) diskUsage.innerText = diskMatch[1] + "%";
}

// ---------------- PIN SUBMISSION ----------------
document.getElementById('pinBtn').addEventListener('click', () => {
    const pin = document.getElementById('pinInput').value;
    if (pin) {
        sendPin(pin);
        document.getElementById('pinInput').value = "";
    }
});

// ---------------- UTILS ----------------
function initializeHUD() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('systemClock').innerText = now.toLocaleTimeString();
        document.getElementById('systemDate').innerText = now.toLocaleDateString('en-GB', {
            day: '2-digit', month: 'LONG', year: 'numeric'
        }).toUpperCase();
    }, 1000);
}

function startLockCountdown(seconds) {
    let timeLeft = seconds;
    lockTimer.innerText = timeLeft;
    const interval = setInterval(() => {
        timeLeft--;
        lockTimer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            faceStatus.innerText = "RESTARTING PROTOCOL...";
        }
    }, 1000);
}
