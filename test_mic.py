import speech_recognition as sr
import os

print("Testing Microphone...")
recognizer = sr.Recognizer()
try:
    with sr.Microphone() as source:
        print("Adjusting for noise...")
        recognizer.adjust_for_ambient_noise(source, duration=0.3)
        print("Say something (3 seconds)...")
        audio = recognizer.listen(source, timeout=3, phrase_time_limit=3)
        print("Recording complete.")
        
        with open("python/temp.wav", "wb") as f:
            f.write(audio.get_wav_data())
        print("Audio saved to python/temp.wav.")
        
        text = recognizer.recognize_google(audio)
        print(f"Heard: {text}")
except Exception as e:
    print(f"ERROR: {str(e)}")
