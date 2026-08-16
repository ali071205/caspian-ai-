import io
import logging
from gtts import gTTS

logger = logging.getLogger("tts_service")


def synthesize_speech(text: str, lang: str = "en") -> bytes:
    """Convert text into MP3 audio bytes using gTTS."""
    clean_text = text.strip()
    if not clean_text:
        clean_text = "No content provided."
    
    # Cap long text to first 1000 characters for audio performance
    if len(clean_text) > 1000:
        clean_text = clean_text[:997] + "..."

    mp3_fp = io.BytesIO()
    tts = gTTS(text=clean_text, lang=lang, slow=False)
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return mp3_fp.read()
