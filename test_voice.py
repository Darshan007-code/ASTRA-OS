import pyttsx3
import sys

print("Testing Voice Engine...")
try:
    engine = pyttsx3.init()
    print("Engine initialized.")
    voices = engine.getProperty('voices')
    print(f"Found {len(voices)} voices.")
    engine.setProperty('rate', 150)
    engine.say("Testing ASTRA voice system. If you hear this, the engine is working.")
    engine.runAndWait()
    print("Test complete.")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
