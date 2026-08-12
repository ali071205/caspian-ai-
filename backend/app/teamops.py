import re
from datetime import datetime, time, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ConversationSummary, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, User


WEEKDAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
CREATE_PATTERNS = (
    re.compile(r"^(?P<owner>[A-Za-z][\w-]*),?\s+(?P<deadline>monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+tak\s+(?P<task>.+?)(?:\s+kar\s+dena|\s+complete\s+chahiye)?[.!?]*$", re.I),
    re.compile(r"^(?P<owner>[A-Za-z][\w-]*),?\s+(?P<task>.+?)\s+(?:by|due)\s+(?P<deadline>monday|tuesday|wednesday|thursday|friday|saturday|sunday)[.!?]*$", re.I),
)


def next_weekday(name: str, now: datetime | None = None) -> datetime:
    now = now or datetime.now()
    days = (WEEKDAYS[name.lower()] - now.weekday()) % 7
    if days == 0:
        days = 7
    return datetime.combine((now + timedelta(days=days)).date(), time(18, 0))


def clean_task(text: str) -> str:
    text = re.sub(r"\s+(kar\s+dena|complete\s+chahiye)$", "", text.strip(), flags=re.I)
    return text[0].upper() + text[1:] if text else text


def extract_intent(message: str, sender_name: str | None = None, now: datetime | None = None) -> dict[str, Any]:
    normalized = " ".join(message.strip().split())
    lower = normalized.casefold().rstrip("?.!")

    if lower in {"accept", "accepted", "haan accept", "i accept"}:
        return {"intent": "ACKNOWLEDGE_TASK", "status": TaskStatus.IN_PROGRESS.value, "confidence": 1.0}
    if lower in {"blocked", "i am blocked", "main blocked hoon"}:
        return {"intent": "UPDATE_TASK", "status": TaskStatus.BLOCKED.value, "confidence": 1.0}
    if lower in {"help", "need help", "help needed"}:
        return {"intent": "REQUEST_HELP", "confidence": 1.0}
    if lower in {"need extension", "extension", "snooze"}:
        return {"intent": "REQUEST_EXTENSION", "confidence": 1.0}
    if "aaj team ko kya karna hai" in lower or "today's team plan" in lower or "team plan today" in lower:
        return {"intent": "QUERY_TODAY", "confidence": 1.0}
    if "koi blocker" in lower or "any blocker" in lower:
        return {"intent": "QUERY_BLOCKERS", "confidence": 1.0}
    status_match = re.search(r"([A-Za-z][\w-]*)\s+ka\s+status", normalized, re.I)
    if status_match:
        return {"intent": "QUERY_MEMBER_STATUS", "owner": status_match.group(1), "confidence": 1.0}

    for pattern in CREATE_PATTERNS:
        match = pattern.match(normalized)
        if match:
            return {
                "intent": "CREATE_TASK",
                "owner": match.group("owner").title(),
                "task": clean_task(match.group("task")),
                "deadline": next_weekday(match.group("deadline"), now),
                "status": TaskStatus.PENDING_ACK.value,
                "confidence": 0.95,
            }
    return {"intent": "UNKNOWN", "confidence": 0.0, "sender": sender_name}


def member_by_name(db: Session, name: str) -> User | None:
    return db.scalar(select(User).where(User.name.ilike(name)))


def active_tasks(db: Session, owner_id: int | None = None) -> list[Task]:
    query = select(Task).where(Task.status.not_in([TaskStatus.DONE.value, TaskStatus.CANCELLED.value]))
    if owner_id is not None:
        query = query.where(Task.owner_id == owner_id)
    return list(db.scalars(query.order_by(Task.deadline.asc().nullslast(), Task.id.asc())))


def today_reply(db: Session) -> str:
    members = db.execute(select(User, TeamMember).join(TeamMember, TeamMember.user_id == User.id)).all()
    lines = ["TODAY"]
    for user, _member in members:
        tasks = active_tasks(db, user.id)
        if tasks:
            lines.append(f"\n{user.name}")
            lines.extend(f"→ {task.title} [{task.status}]" for task in tasks)
    blocked = [task for task in active_tasks(db) if task.status == TaskStatus.BLOCKED.value]
    if blocked:
        lines.append("\nRISKS")
        lines.extend(f"→ {task.title} is blocked" for task in blocked)
    if len(lines) == 1:
        lines.append("\nNo active tasks.")
    return "\n".join(lines)


def member_status_reply(db: Session, name: str) -> str:
    user = member_by_name(db, name)
    if not user:
        return f"{name} is not in the team directory."
    tasks = active_tasks(db, user.id)
    if not tasks:
        return f"{user.name} has no active tasks."
    return "\n".join([f"{user.name} STATUS", *[f"→ {task.title}: {task.status}" for task in tasks]])


def blockers_reply(db: Session) -> str:
    tasks = list(db.scalars(select(Task).where(Task.status == TaskStatus.BLOCKED.value)))
    if not tasks:
        return "No blockers reported."
    rows = []
    for task in tasks:
        owner = db.get(User, task.owner_id)
        rows.append(f"→ {owner.name if owner else 'Unknown'}: {task.title}")
    return "BLOCKERS\n" + "\n".join(rows)


def remember_summary(db: Session, channel: str, message: str, intent: dict[str, Any], reply: str) -> None:
    safe_summary = f"Intent={intent['intent']}; message={message[:240]}; outcome={reply[:300]}"
    db.add(ConversationSummary(channel=channel, summary=safe_summary))


def process_message(db: Session, message: str, sender_name: str | None, channel: str) -> dict[str, Any]:
    intent = extract_intent(message, sender_name)
    kind = intent["intent"]

    if kind == "CREATE_TASK":
        owner = member_by_name(db, intent["owner"])
        if not owner:
            reply = f"I couldn't create the task: {intent['owner']} is not a team member."
        else:
            task = Task(title=intent["task"], owner_id=owner.id, deadline=intent["deadline"], status=TaskStatus.PENDING_ACK.value)
            db.add(task); db.flush()
            db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
            db.add(Notification(user_id=owner.id, title="New commitment", body=f"{task.title} · Due {task.deadline:%A, %d %b}", severity="normal", channel="app"))
            reply = f"Task created for {owner.name}: {task.title}. Due {task.deadline:%A, %d %b at %I:%M %p}. Awaiting acknowledgement."
    elif kind in {"ACKNOWLEDGE_TASK", "UPDATE_TASK"}:
        sender = member_by_name(db, sender_name or "")
        task = active_tasks(db, sender.id)[0] if sender and active_tasks(db, sender.id) else None
        if not sender:
            reply = "Please identify the sender before updating a task."
        elif not task:
            reply = f"{sender.name} has no active task to update."
        else:
            previous = task.status
            task.status = intent["status"]
            db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
            if task.status == TaskStatus.BLOCKED.value:
                db.add(Notification(user_id=task.owner_id, title="Blocker recorded", body=f"{task.title} needs attention.", severity="critical", channel="app"))
            reply = f"{task.title} → {task.status}."
    elif kind in {"REQUEST_HELP", "REQUEST_EXTENSION"}:
        sender = member_by_name(db, sender_name or "")
        tasks = active_tasks(db, sender.id) if sender else []
        task = tasks[0] if tasks else None
        if not sender:
            reply = "Please identify the sender before requesting support."
        elif not task:
            reply = f"{sender.name} has no active task for this request."
        elif kind == "REQUEST_HELP":
            previous = task.status
            task.status = TaskStatus.BLOCKED.value
            db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
            reply = f"Help requested for {task.title}. It is now marked BLOCKED for team visibility."
        else:
            reply = f"Extension requested for {task.title}. The deadline is unchanged until the team lead approves it."
    elif kind == "QUERY_TODAY":
        reply = today_reply(db)
    elif kind == "QUERY_MEMBER_STATUS":
        reply = member_status_reply(db, intent["owner"])
    elif kind == "QUERY_BLOCKERS":
        reply = blockers_reply(db)
    else:
        reply = "I couldn't safely understand that. Try assigning a task with an owner and weekday, or ask for team status."

    remember_summary(db, channel, message, intent, reply)
    db.commit()
    return {"reply": reply, "intent": intent}
