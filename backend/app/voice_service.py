import io
import json
import logging
from os import getenv
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .ai_router import gemini_enabled, routing_context
from .teamops import process_message

logger = logging.getLogger("voice_service")


class VoiceDirective(BaseModel):
    summary: str = Field(description="A concise executive summary of the voice note.")
    needs_task: bool = Field(description="True if an actionable commitment or task assignment was spoken.")
    actionable_directive: str = Field(default="", description="The exact task action string.")
    owner_id: int | None = Field(default=None, description="The assigned user ID from the team directory.")
    deadline_hours: int = Field(default=24, ge=1, le=168)
    priority: str = Field(default="normal", description="normal, high, or critical")


def groq_enabled() -> bool:
    return bool(getenv("GROQ_API_KEY"))


def transcribe_audio_groq(file_bytes: bytes, filename: str = "voice_note.m4a") -> str:
    """Transcribe audio bytes using Groq Whisper (whisper-large-v3)."""
    if not groq_enabled():
        raise RuntimeError("GROQ_API_KEY is not configured. Add it to .env to enable Whisper STT.")
    
    from groq import Groq
    client = Groq(api_key=getenv("GROQ_API_KEY"))
    audio_file = io.BytesIO(file_bytes)
    audio_file.name = filename

    transcription = client.audio.transcriptions.create(
        file=audio_file,
        model="whisper-large-v3",
        response_format="json",
        temperature=0.0,
    )
    return transcription.text.strip()


def summarize_and_extract_voice_directive(
    db: Session,
    transcript: str,
    sender_name: str | None = "Admin"
) -> dict[str, Any]:
    """Process a voice note transcript with Gemini summarization and route through TeamOps."""
    summary = transcript
    if gemini_enabled():
        try:
            from google import genai
            context = routing_context(db)
            prompt = f"""You are the voice analyst for Caspian TeamOps Sentinel.
Summarize the following spoken voice note and determine if an action or task was assigned.

ACTIVE TEAM DIRECTORY:
{json.dumps(context['team_directory'])}

VOICE NOTE TRANSCRIPT:
{transcript}
"""
            client = genai.Client(api_key=getenv("GEMINI_API_KEY"))
            response = client.interactions.create(
                model=getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                input=prompt,
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": VoiceDirective.model_json_schema(),
                },
            )
            parsed = VoiceDirective.model_validate_json(response.output_text)
            summary = parsed.summary
        except Exception as exc:
            logger.warning(f"Gemini voice summarization fallback: {exc}")

    # Process through TeamOps engine to create task, audit history, and notifications
    ops_result = process_message(db, transcript, sender_name=sender_name, channel="voice")
    
    return {
        "transcript": transcript,
        "summary": summary,
        "teamops_result": ops_result,
        "sender": sender_name,
    }
