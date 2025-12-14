#!/usr/bin/env python3
"""
Whisper Speech Recognition Server for Voice Duel Arena
Runs alongside the Node.js game server to provide accurate spell recognition.
"""

import os
import sys
import tempfile
import warnings
from flask import Flask, request, jsonify
from flask_cors import CORS

# Suppress warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# Global whisper model (loaded once)
whisper_model = None

def load_whisper():
    """Load the Whisper model (lazy loading)"""
    global whisper_model
    if whisper_model is None:
        try:
            import whisper
            print("🎙️ Loading Whisper model (base)...")
            whisper_model = whisper.load_model("base")
            print("✅ Whisper model loaded successfully!")
        except ImportError:
            print("❌ Whisper not installed. Run: pip install openai-whisper")
            sys.exit(1)
    return whisper_model

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "model": "whisper-base"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text.
    Expects: multipart/form-data with 'audio' file
    Returns: { "text": "transcribed text", "success": true }
    """
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name
    
    try:
        model = load_whisper()
        
        # Transcribe with Whisper
        result = model.transcribe(
            tmp_path,
            language="en",
            fp16=False,  # Use FP32 for compatibility
            task="transcribe"
        )
        
        text = result.get("text", "").strip()
        print(f"🎤 Transcribed: '{text}'")
        
        return jsonify({
            "success": True,
            "text": text
        })
        
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
    finally:
        # Cleanup temp file
        try:
            os.unlink(tmp_path)
        except:
            pass

if __name__ == '__main__':
    # Pre-load model on startup
    print("🧙‍♂️ Starting Whisper Speech Server...")
    load_whisper()
    
    # Run server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )
