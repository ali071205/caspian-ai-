import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .database import Base, SessionLocal, engine
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
    message.reply(result["reply"])
    return result


def run_listener() -> None:
    load_caspian_environment()
    if not os.getenv("CASPIAN_API_KEY"):
        raise RuntimeError("CASPIAN_API_KEY is missing. Run `caspian init` in the project root.")
    from caspian_sdk import CommClient

    Base.metadata.create_all(engine)
    client = CommClient()
    client.on_message(handle_caspian_message)
    print("Caspian TeamOps listener is online. Press Ctrl+C to stop.")
    client.listen(ack="TeamOps received your message. Processing it now…")
