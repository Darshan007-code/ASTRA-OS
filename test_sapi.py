import win32com.client
import sys

print("Testing SAPI5 (Windows Direct) Voice...")
try:
    speaker = win32com.client.Dispatch("SAPI.SpVoice")
    print("Speaker dispatched.")
    voices = speaker.GetVoices()
    print(f"Found {len(voices)} voices.")
    for i, v in enumerate(voices):
        print(f"{i}: {v.GetDescription()}")
    
    text = "Testing ASTRA Alexa style voice. One two three."
    print(f"Speaking: {text}")
    speaker.Speak(text)
    print("Test complete.")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
