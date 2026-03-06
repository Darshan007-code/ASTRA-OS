# ================= ASTRA MASTER BUILD v1.1 + PHASE 6 =================

import cv2
import os
import json
import requests
import time
import datetime
import subprocess
import winsound
import random
import threading
import speech_recognition as sr
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from deepface import DeepFace
import win32com.client 
import pythoncom 
import queue
import sys

# ================= SETTINGS =================
EMERGENCY_PASSPHRASE = "darshan have a nice day"
EMERGENCY_PIN = "3849"
MAX_FACE_ATTEMPTS = 3
LOCK_TIME_SECONDS = 30
IDLE_TIME_SECONDS = 60

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMORY_FILE = os.path.join(SCRIPT_DIR, "memory.json")
FACE_DATA_DIR = os.path.join(SCRIPT_DIR, "face_data")
TEMP_IMAGE = os.path.join(FACE_DATA_DIR, "temp.jpg")
USER_IMAGE = os.path.join(FACE_DATA_DIR, "user.jpg")

# ================= VOICE SYSTEM =================
speech_queue = queue.Queue()
is_speaking = False 

def voice_worker():
    global is_speaking
    pythoncom.CoInitialize()
    try:
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        while True:
            text = speech_queue.get()
            if text is None: break
            is_speaking = True 
            speaker.Speak(text) 
            is_speaking = False 
            speech_queue.task_done()
    except Exception as e:
        print(f"DEBUG Voice Error: {e}", flush=True)
    finally:
        pythoncom.CoUninitialize()

threading.Thread(target=voice_worker, daemon=True).start()

def speak(text, now=False):
    print(f"ASTRA: {text}", flush=True)
    if now:
        while not speech_queue.empty():
            try: speech_queue.get_nowait()
            except: break
    speech_queue.put(text)

# ================= MEMORY =================
def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {
            "preferences": {
                "favorite_songs": ["sitaare", "matsuka punk"],
                "favorite_movie": "kgf",
                "favorite_player": "virat kohli",
                "hobbies": ["creating new things", "playing cricket", "watching movies"],
                "goal": "build a powerful ai system"
            },
            "conversation": [],
            "usage": {"apps": {}, "songs": {}}
        }
    try:
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    except: return {}

def save_memory():
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=4)

memory = load_memory()

# ================= SPOTIFY =================
SPOTIFY_CLIENT_ID = "fef7299bdf284c0f9be72136ae00cffb"
SPOTIFY_CLIENT_SECRET = "ea9a2fdde60d4e4ba24450ac4e8fb197"
SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8888/callback"
scope = "user-read-playback-state,user-modify-playback-state"

try:
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=scope
    ))
except:
    sp = None

# ================= VOICE LISTENING =================
recognizer = sr.Recognizer()
recognizer.energy_threshold = 150 
recognizer.dynamic_energy_threshold = True

def listen(timeout=5):
    while is_speaking or not speech_queue.empty():
        time.sleep(0.05)
    try:
        with sr.Microphone() as source:
            print("ASTRA: Listening...", flush=True)
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=10)
        if is_speaking: return ""
        text = recognizer.recognize_google(audio)
        print(f"You: {text}", flush=True)
        return text.lower()
    except: return ""

# ================= APP & MUSIC HANDLERS =================
def open_application(app_name):
    app_name = app_name.lower().strip()
    exe_apps = {"chrome": "chrome.exe", "spotify": "spotify.exe", "notepad": "notepad.exe", "edge": "msedge.exe"}
    uri_apps = {"whatsapp": "whatsapp:", "mail": "outlookmail:", "settings": "ms-settings:"}
    speak(f"Opening {app_name}.")
    try:
        if app_name in exe_apps: subprocess.Popen(f'start {exe_apps[app_name]}', shell=True)
        elif app_name in uri_apps: subprocess.Popen(f'start {uri_apps[app_name]}', shell=True)
        else: subprocess.Popen(f'start {app_name}', shell=True)
    except: speak(f"Error opening {app_name}.")

def close_application(app_name):
    app_name = app_name.lower().strip()
    target = app_name if app_name.endswith(".exe") else f"{app_name}.exe"
    if "chrome" in app_name: target = "chrome.exe"
    speak(f"Closing {app_name}.")
    try: subprocess.Popen(f"taskkill /f /im {target}", shell=True)
    except: speak(f"Failed to close {app_name}.")

def play_music(song_name):
    if not sp:
        speak("Spotify is not configured.")
        return
    
    if "favorite" in song_name or "favourite" in song_name:
        song_name = memory["preferences"]["favorite_songs"][0]
    
    speak(f"Playing {song_name} on Spotify.")
    try:
        results = sp.search(q=song_name, type="track", limit=1)
        if results["tracks"]["items"]:
            track_uri = results["tracks"]["items"][0]["uri"]
            devices = sp.devices()["devices"]
            if devices:
                sp.start_playback(device_id=devices[0]["id"], uris=[track_uri])
            else:
                speak("Please open Spotify first.")
        else:
            speak("Song not found.")
    except:
        speak("Spotify playback error.")

# ================= COMMAND HANDLER =================
def handle_command(command):
    if not command: return
    if "play" in command:
        song = command.replace("play", "").strip()
        play_music(song)
        return
    if "open" in command:
        open_application(command.replace("open","").strip())
        return
    if "close" in command:
        close_application(command.replace("close","").strip())
        return
    if "hello" in command:
        speak("Hello Darshan.")
        return
    
    speak("Processing request.")
    try:
        response = requests.post("http://localhost:11434/api/generate", 
                               json={"model": "llama3", "prompt": command, "stream": False}, timeout=60)
        speak(response.json()["response"])
    except: speak("AI brain offline.")

# ================= SECURITY =================
def trigger_security(frame):
    print("ASTRA: Security alert", flush=True) 
    speak("Security alert. Intruder detected. System locking.", now=True)
    intruder_dir = os.path.join(SCRIPT_DIR, "intruders")
    os.makedirs(intruder_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    if frame is not None: cv2.imwrite(os.path.join(intruder_dir, f"intruder_{timestamp}.jpg"), frame)
    print("ASTRA: System locked", flush=True)
    time.sleep(LOCK_TIME_SECONDS)
    
    print("ASTRA: Say emergency passphrase", flush=True)
    speak("Provide emergency passphrase.")
    phrase = listen(timeout=10)
    if EMERGENCY_PASSPHRASE in phrase:
        print("ASTRA: SUCCESSFULLY RECOGNIZED", flush=True)
        speak("Emergency override accepted.")
        return True
    
    print("ASTRA: Enter PIN", flush=True)
    speak("Enter emergency PIN.")
    pin = input() 
    if pin == EMERGENCY_PIN:
        print("ASTRA: SUCCESSFULLY RECOGNIZED", flush=True)
        speak("Access restored.")
        return True
    return False

def verify_face():
    attempts = 0
    time.sleep(2)
    while attempts < MAX_FACE_ATTEMPTS:
        speak("Verifying.")
        time.sleep(1.5)
        if not os.path.exists(TEMP_IMAGE):
            time.sleep(1)
            continue
        print("[CAPTURE]", flush=True)
        try:
            result = DeepFace.verify(USER_IMAGE, TEMP_IMAGE, model_name="Facenet", enforce_detection=False)
            if result["verified"]:
                print("ASTRA: SUCCESSFULLY RECOGNIZED", flush=True)
                speak("Access granted. Welcome Darshan.")
                return True
        except: pass
        attempts += 1
        if attempts < MAX_FACE_ATTEMPTS:
            speak(f"Failed. Attempt {attempts}.")
        else: return trigger_security(cv2.imread(TEMP_IMAGE))
    return False

# ================= PHASE 6 - SYSTEM MONITORING =================
def telemetry_monitor():
    while True:
        try:
            cpu = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory().percent
            disk = psutil.disk_usage('/').percent
            # Send specific telemetry signal for UI
            print(f"ASTRA: TELEMETRY CPU:{cpu} RAM:{ram} DISK:{disk}", flush=True)
        except:
            pass
        time.sleep(2)

# ================= PHASE 6 - LIVE UPDATES =================
NEWS_API_KEY = "4bd26ad060c14b8f9d3d482488c7c7c7"

def news_monitor():
    while True:
        try:
            # Broadening search to global news if regional fails
            response = requests.get(f"https://newsapi.org/v2/top-headlines?language=en&apiKey={NEWS_API_KEY}", timeout=10)
            if response.status_code == 200:
                articles = response.json().get('articles', [])
                if articles:
                    for article in articles[:10]:
                        print(f"ASTRA: NEWS {article['title']}", flush=True)
                        time.sleep(25) 
                else:
                    print("ASTRA: NEWS No headlines available at the moment.", flush=True)
        except: pass
        time.sleep(60)

CRICKET_API_KEY = "c6efad1f-8097-48bb-8799-f1729d6f5415"

def cricket_monitor():
    while True:
        try:
            response = requests.get(f"https://api.cricapi.com/v1/currentMatches?apikey={CRICKET_API_KEY}&offset=0", timeout=10)
            if response.status_code == 200:
                matches = response.json().get('data', [])
                india_match = None
                live_match = None
                
                # Check for India (Live or Recent)
                for m in matches:
                    if "India" in m.get('name', ''):
                        india_match = m
                        if not m.get('matchEnded'):
                            live_match = m
                            break
                
                if live_match:
                    print(f"ASTRA: CRICKET LIVE: {live_match['name']} | {live_match['status']}", flush=True)
                elif india_match:
                    print(f"ASTRA: CRICKET RECENT: {india_match['name']} | {india_match['status']}", flush=True)
                elif matches:
                    # Show any other live match
                    any_live = next((m for m in matches if not m.get('matchEnded')), matches[0])
                    print(f"ASTRA: CRICKET {any_live['name']} | {any_live['status']}", flush=True)
                else:
                    print("ASTRA: CRICKET No recent matches found.", flush=True)
        except: pass
        time.sleep(120)

# ================= MAIN =================
def run_astra():
    print("ASTRA: Booting...", flush=True)

    # Start telemetry in background (Safe to start early)
    threading.Thread(target=telemetry_monitor, daemon=True).start()

    speak("System initializing.")
    if not verify_face(): sys.exit(0)

    speak("All protocols active.")

    # Start Live Feeds ONLY AFTER login
    threading.Thread(target=news_monitor, daemon=True).start()
    threading.Thread(target=cricket_monitor, daemon=True).start()

    while True:
        phrase = listen()
        if phrase and "astra" in phrase:
            handle_command(phrase.replace("astra", "").strip())

if __name__ == "__main__":
    run_astra()