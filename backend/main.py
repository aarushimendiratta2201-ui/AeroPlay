from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import librosa
import numpy as np
import tempfile
import os
from anthropic import Anthropic

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

def extract_features(path):
    try:
        y, sr = librosa.load(path, duration=30, sr=None)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        energy = float(np.mean(librosa.feature.rms(y=y)))
        spectral = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        valence = float(np.mean(librosa.feature.chroma_stft(y=y, sr=sr)))
        return {
            "tempo": float(tempo),
            "energy": energy,
            "spectral_centroid": spectral,
            "valence": valence,
        }
    except Exception as e:
        return None

def classify_mood(features):
    if not features:
        return "Chill"
    tempo = features["tempo"]
    energy = features["energy"]
    valence = features["valence"]
    if tempo > 120 and energy > 0.05:
        return "Energetic"
    elif tempo > 100 and valence > 0.45:
        return "Happy"
    elif tempo < 80 and energy < 0.03:
        return "Melancholic"
    elif energy < 0.04 and valence < 0.35:
        return "Focused"
    else:
        return "Chill"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyse")
async def analyse(file: UploadFile = File(...)):
    if not file.filename.endswith((".mp3", ".wav", ".ogg")):
        return {"error": "Unsupported file type", "mood": "Chill"}
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        features = extract_features(tmp_path)
        mood = classify_mood(features)
        return {"mood": mood, "features": features}
    except Exception as e:
        return {"mood": "Chill", "error": str(e)}
    finally:
        os.unlink(tmp_path)

@app.post("/describe")
async def describe(data: dict):
    mood = data.get("mood", "Chill")
    tracks = data.get("tracks", [])
    if not client.api_key:
        descriptions = {
            "Energetic": "High-energy tracks to fuel your momentum.",
            "Happy": "Bright and uplifting songs for a good day.",
            "Melancholic": "Gentle, reflective music for quieter moments.",
            "Focused": "Clean, minimal sounds to keep you in the zone.",
            "Chill": "Laid-back tracks to ease into the moment.",
        }
        return {"description": descriptions.get(mood, "A curated set of tracks.")}
    try:
        track_list = ", ".join(tracks[:5]) if tracks else "various tracks"
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": f"""Write a 2-sentence playlist description.
Mood: {mood}
Tracks: {track_list}
Rules: poetic but grounded, no emojis, no quotes, no generic phrases like 'sonic journey'."""
            }]
        )
        return {"description": message.content[0].text}
    except Exception as e:
        return {"description": f"A {mood.lower()} collection of tracks.", "error": str(e)}
