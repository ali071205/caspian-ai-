import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .database import SessionLocal, init_db
from .teamops import process_message


ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


def load_caspian_environment() -> None:
    load_dotenv(ROOT_ENV, override=False)


def sender_address(sender: Any) -> str:
    if isinstance(sender, dict):
        return str(
            sender.get("address")
            or sender.get("email")
            or sender.get("id")
            or sender.get("user_id")
            or ""
        ).strip().casefold()
    return ""


def sender_name(sender: Any) -> str | None:
    address = sender_address(sender)
    try:
        mapping = json.loads(os.getenv("CASPIAN_SENDER_MAP", "{}"))
    except json.JSONDecodeError:
        mapping = {}
    normalized = {str(key).casefold(): str(value) for key, value in mapping.items()}
    if address in normalized:
        return normalized[address]
    if isinstance(sender, dict) and sender.get("name"):
        return str(sender["name"]).strip()
    return None


def handle_caspian_message(message: Any) -> dict[str, Any]:
    text = str(getattr(message, "text", "") or "").strip()
    if not text:
        result = {"reply": "I received an empty message. Send a task assignment or team-status question.", "intent": {"intent": "UNKNOWN"}}
    else:
        channel = str(getattr(message, "channel", "email") or "email")
        with SessionLocal() as db:
            result = process_message(db, text, sender_name(getattr(message, "sender", None)), channel)

    # Build rich blocks for Slack / Discord / Email rendering
    try:
        from caspian_sdk import blocks as b
        reply_text = result.get("reply", "Directive processed.")
        blocks = [
            b.card(
                title="🛡️ Caspian TeamOps Sentinel",
                subtitle="Operational Action Processed",
                text=reply_text,
                buttons=[
                    {"label": "✓ Acknowledge", "value": "accept"},
                    {"label": "⚠️ Report Blocker", "value": "blocked"},
                ],
            )
        ]
        message.reply(text=reply_text, blocks=blocks)
    except Exception:
        message.reply(result.get("reply", "Processed."))
    return result


def handle_caspian_interaction(interaction: Any) -> None:
    """Handle button tap events from Slack Block Kit or Discord buttons."""
    value = str(getattr(interaction, "value", "") or "").strip()
    if not value:
        interaction.reply("Button action received.")
        return
    with SessionLocal() as db:
        result = process_message(db, value, sender_name="Interactive User", channel="slack")
    interaction.reply(result.get("reply", f"Action {value} completed."))


def run_listener() -> None:
    load_caspian_environment()
    if not os.getenv("CASPIAN_API_KEY"):
        raise RuntimeError("CASPIAN_API_KEY is missing. Run `caspian init` in the project root.")
    from caspian_sdk import CommClient

    init_db()
    client = CommClient()
    client.on_message(handle_caspian_message)
    client.on_interaction(handle_caspian_interaction)
    print("Caspian TeamOps multi-channel listener is online. Press Ctrl+C to stop.")
    client.listen(ack="TeamOps received your message. Processing it now…")

