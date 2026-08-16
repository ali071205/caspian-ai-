import io
import json
import logging
import re
from datetime import datetime, time, timedelta
from os import getenv
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai_router import gemini_enabled, routing_context
from .models import AuditLog, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, TeamWorkspace, User
from .teamops import WEEKDAYS, clean_task, extract_intent, member_by_name, next_weekday, process_message

logger = logging.getLogger("voice_service")


class VoiceDirective(BaseModel):
    summary: str = Field(description="A concise executive summary of the voice note.")
    needs_task: bool = Field(description="True if an actionable commitment or task assignment was spoken.")
    actionable_directive: str = Field(default="", description="The exact task action string.")
    owner_id: int | None = Field(default=None, description="The assigned user ID from the active team directory.")
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


def parse_immediate_deadline(text: str, now: datetime | None = None, default_hours: int = 24) -> datetime:
    """Resolve spoken deadline text into the immediate upcoming date and time."""
    now = now or datetime.now()
    clean = text.lower().strip()

    # Relative hours / minutes
    hours_match = re.search(r"(?:in|within)\s+(\d{1,2})\s+hours?", clean)
    if hours_match:
        return now + timedelta(hours=int(hours_match.group(1)))

    if any(k in clean for k in ("tonight", "aaj raat", "today", "aaj")):
        # If morning/afternoon, set to 8 PM tonight; if already night, set to +3 hours
        target_today = datetime.combine(now.date(), time(20, 0))
        return target_today if now < target_today else now + timedelta(hours=3)

    if any(k in clean for k in ("tomorrow", "kal")):
        return datetime.combine((now + timedelta(days=1)).date(), time(18, 0))

    # Weekday check (e.g. "by Friday", "Friday tak")
    for day_name, day_idx in WEEKDAYS.items():
        if day_name in clean:
            days_ahead = (day_idx - now.weekday()) % 7
            if days_ahead == 0:
                # If today is Friday and user says "by Friday", if before 6pm make it today 6pm, else next Friday
                if now.hour < 18:
                    return datetime.combine(now.date(), time(18, 0))
                days_ahead = 7
            return datetime.combine((now + timedelta(days=days_ahead)).date(), time(18, 0))

    # Default to immediate next day at 6 PM or default_hours
    return now + timedelta(hours=default_hours)


def preview_and_extract_voice_directive(
    db: Session,
    transcript: str,
    sender_name: str | None = "Admin",
    team_code: str | None = None,
) -> dict[str, Any]:
    """Analyze voice transcript and extract structured recipient transfer preview before confirming."""
    clean_text = transcript.strip()
    if not clean_text:
        return {
            "transcript": "",
            "summary": "No speech detected.",
            "extracted_task": None,
            "sender": sender_name,
        }

    summary = clean_text
    title = clean_task(clean_text)
    owner_id = None
    owner_name = None
    owner_role = None
    priority = "normal"
    now_dt = datetime.now()
    deadline_dt = parse_immediate_deadline(clean_text, now_dt, default_hours=24)

    # 1. Gemini Voice Directive analysis
    if gemini_enabled():
        try:
            from google import genai
            from google.genai import types
            context = routing_context(db, team_code=team_code)
            prompt = f"""You are the voice analyst for Caspian TeamOps Sentinel.
Analyze the following spoken directive and determine what task needs to be transferred, to which team member, and the immediate deadline.

ACTIVE TEAM DIRECTORY:
{json.dumps(context['team_directory'])}

CURRENT DATE & TIME:
{now_dt.strftime('%A, %d %B %Y, %I:%M %p')}

VOICE DIRECTIVE TRANSCRIPT:
{clean_text}

INSTRUCTIONS:
1. Identify the task title and the assigned team member.
2. If a relative day is mentioned (e.g. 'Friday', 'tomorrow', 'tonight'), calculate deadline_hours from the current time to that immediate upcoming moment.
3. If no day is mentioned, default deadline_hours to 24.
"""
            client = genai.Client(api_key=getenv("GEMINI_API_KEY"))
            response = client.models.generate_content(
                model=getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=VoiceDirective,
                ),
            )
            parsed = VoiceDirective.model_validate_json(response.text)
            summary = parsed.summary
            if parsed.actionable_directive:
                title = clean_task(parsed.actionable_directive)
            if parsed.owner_id:
                target_user = db.get(User, parsed.owner_id)
                if target_user:
                    owner_id = target_user.id
                    owner_name = target_user.name
                    member_row = db.scalar(select(TeamMember).where(TeamMember.user_id == target_user.id))
                    owner_role = member_row.role if member_row else "Team Contributor"
            priority = parsed.priority
            if parsed.deadline_hours and parsed.deadline_hours > 0:
                # Use Gemini calculated hours or fallback to deterministic parse
                deadline_dt = now_dt + timedelta(hours=parsed.deadline_hours)
        except Exception as exc:
            logger.warning(f"Gemini preview extraction fallback: {exc}")

    # 2. Rule-based fallback if owner was not resolved
    if not owner_id:
        intent = extract_intent(clean_text, sender_name)
        if intent.get("owner"):
            target_user = member_by_name(db, intent["owner"], team_code=team_code)
            if target_user:
                owner_id = target_user.id
                owner_name = target_user.name
                member_row = db.scalar(select(TeamMember).where(TeamMember.user_id == target_user.id))
                owner_role = member_row.role if member_row else "Team Contributor"
                if intent.get("task"):
                    title = clean_task(intent["task"])
                if intent.get("deadline"):
                    deadline_dt = intent["deadline"]

    # If still no owner resolved, assign to sender or first active team member
    if not owner_id:
        workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip()))) if team_code else None
        first_member = db.scalar(
            select(User)
            .join(TeamMember, TeamMember.user_id == User.id)
            .where(
                TeamMember.approved.is_(True),
                TeamMember.active.is_(True),
                *( [TeamMember.team_id == workspace.id] if workspace else [] )
            )
        )
        if first_member:
            owner_id = first_member.id
            owner_name = first_member.name
            member_row = db.scalar(select(TeamMember).where(TeamMember.user_id == first_member.id))
            owner_role = member_row.role if member_row else "Team Contributor"

    deadline_formatted = deadline_dt.strftime("%A, %d %b at %I:%M %p")

    return {
        "transcript": clean_text,
        "summary": summary,
        "extracted_task": {
            "title": title[:120],
            "owner_id": owner_id,
            "owner_name": owner_name or "Unassigned",
            "owner_role": owner_role or "Team Contributor",
            "priority": priority,
            "deadline_str": deadline_formatted,
            "deadline_iso": deadline_dt.isoformat(),
        },
        "sender": sender_name,
    }


def summarize_and_extract_voice_directive(
    db: Session,
    transcript: str,
    sender_name: str | None = "Admin",
    team_code: str | None = None,
) -> dict[str, Any]:
    """Process a voice note transcript with Gemini summarization and route through TeamOps."""
    summary = transcript
    if gemini_enabled():
        try:
            from google import genai
            from google.genai import types
            context = routing_context(db, team_code=team_code)
            prompt = f"""You are the voice analyst for Caspian TeamOps Sentinel.
Summarize the following spoken voice note and determine if an action or task was assigned.

ACTIVE TEAM DIRECTORY:
{json.dumps(context['team_directory'])}

VOICE NOTE TRANSCRIPT:
{transcript}
"""
            client = genai.Client(api_key=getenv("GEMINI_API_KEY"))
            response = client.models.generate_content(
                model=getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=VoiceDirective,
                ),
            )
            parsed = VoiceDirective.model_validate_json(response.text)
            summary = parsed.summary
        except Exception as exc:
            logger.warning(f"Gemini voice summarization fallback: {exc}")

    # Process through TeamOps engine to create task, audit history, and notifications
    ops_result = process_message(db, transcript, sender_name=sender_name, channel="voice", team_code=team_code)
    
    return {
        "transcript": transcript,
        "summary": summary,
        "teamops_result": ops_result,
        "sender": sender_name,
    }
