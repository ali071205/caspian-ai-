import re
from datetime import datetime, time, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ConversationSummary, Dependency, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, User
from .ai_router import AIRoutingDecision, route_with_gemini


WEEKDAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
CREATE_PATTERNS = (
    re.compile(r"^(?P<owner>[A-Za-z][\w-]*),?\s+(?P<deadline>monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+tak\s+(?P<task>.+?)(?:\s+kar\s+dena|\s+complete\s+chahiye)?[.!?]*$", re.I),
    re.compile(r"^(?P<owner>[A-Za-z][\w-]*),?\s+(?P<task>.+?)\s+(?:by|due)\s+(?P<deadline>monday|tuesday|wednesday|thursday|friday|saturday|sunday)[.!?]*$", re.I),
    re.compile(r"^(?P<owner>[A-Za-z][\w-]*),?\s+(?P<task>.+?)\s+(?:by\s+)?(?:tonight|aaj\s+raat\s+tak)[.!?]*$", re.I),
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


def tonight(now: datetime | None = None) -> datetime:
    now = now or datetime.now()
    deadline = datetime.combine(now.date(), time(20, 0))
    return deadline if now < deadline else deadline + timedelta(days=1)


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

    # Delay reporting (e.g. "API will be 2 hours late", "API 2 hours late hogi")
    delay_match = re.search(r"(?P<task>[A-Za-z][\w -]{1,80}?)\s+(?:will be\s+|is\s+|hi\s+)?(?P<hours>\d{1,2})\s+hours?\s+(?:late|delayed)", normalized, re.I)
    if delay_match:
        return {"intent": "REPORT_DELAY", "task": delay_match.group("task").strip(), "hours": int(delay_match.group("hours")), "confidence": 0.95}

    for pattern in CREATE_PATTERNS:
        match = pattern.match(normalized)
        if match:
            deadline_name = match.groupdict().get("deadline")
            return {
                "intent": "CREATE_TASK",
                "owner": match.group("owner").title(),
                "task": clean_task(match.group("task")),
                "deadline": next_weekday(deadline_name, now) if deadline_name else tonight(now),
                "status": TaskStatus.PENDING_ACK.value,
                "confidence": 0.95,
            }
    return {"intent": "UNKNOWN", "confidence": 0.0, "sender": sender_name}


def detect_secret(message: str) -> bool:
    # Filename detection
    if re.search(r"(?:^|[\s/'\"])(?:\.env\b|env file)", message, re.I):
        return True
    # Simple secret name detection and some common key patterns
    secret_names = ["AWS_SECRET_ACCESS_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PRIVATE_KEY", "SECRET_KEY"]
    for name in secret_names:
        if name.lower() in message.lower():
            return True
    # AWS access key pattern (simple)
    if re.search(r"AKIA[0-9A-Z]{16}", message):
        return True
    # Generic key-like pattern (VAR=... with long value)
    if re.search(r"\b[A-Z][A-Z0-9_]{4,39}\s*=\s*[^\s]{12,}", message):
        return True
    return False


def leads_for_alert(db: Session) -> list[User]:
    rows = db.execute(select(User, TeamMember).join(TeamMember, TeamMember.user_id == User.id)).all()
    leads = []
    for user, member in rows:
        if member.role and "lead" in member.role.casefold():
            leads.append(user)
    # fallback to Ali if explicit lead role not found
    if not leads:
        ali = db.scalar(select(User).where(User.name.ilike("ali")))
        if ali:
            leads.append(ali)
    return leads


def active_members(db: Session) -> list[tuple[User, TeamMember]]:
    return list(db.execute(select(User, TeamMember).join(TeamMember, TeamMember.user_id == User.id).where(TeamMember.active.is_(True))).all())


def classify_incident(text: str) -> dict[str, str] | None:
    """Classify high-signal operational failures into a safe routing category."""
    lower = text.casefold()
    if detect_secret(text) or any(term in lower for term in ("credential exposed", "token leaked", "key leaked", "secret leaked")):
        return {"kind": "security", "title": "Security exposure review", "role": "security|devops|aws|lead", "detail": "Potential credential exposure detected. The original value was redacted.", "hours": "1"}
    if any(term in lower for term in ("blank screen", "screen is blank", "rendering broken", "ui broken", "layout broken", "visual regression", "screen is down")):
        return {"kind": "ui", "title": "UI incident", "role": "ui|frontend|design", "detail": text[:240], "hours": "4"}
    if any(term in lower for term in ("aws", "deployment", "server down", "production down", "database down", "500", "timeout", "infrastructure")):
        return {"kind": "infrastructure", "title": "Infrastructure incident", "role": "devops|aws|cloud|backend", "detail": text[:240], "hours": "2"}
    if any(term in lower for term in ("api failure", "api is down", "backend error", "endpoint failing")):
        return {"kind": "backend", "title": "Backend incident", "role": "backend|api|server", "detail": text[:240], "hours": "4"}
    return None


def routed_owner(db: Session, role_query: str, preferred_owner_id: int | None = None) -> User | None:
    if preferred_owner_id:
        preferred = db.get(User, preferred_owner_id)
        if preferred:
            return preferred
    roles = role_query.split("|")
    for user, member in active_members(db):
        role = member.role.casefold()
        if any(term in role for term in roles):
            return user
    leads = leads_for_alert(db)
    if leads:
        return leads[0]
    members = active_members(db)
    return members[0][0] if members else None


def create_routed_incident(
    db: Session,
    incident: dict[str, str],
    source: str,
    preferred_owner_id: int | None = None,
) -> Task | None:
    owner = routed_owner(db, incident["role"], preferred_owner_id)
    if not owner:
        return None
    deadline = datetime.now() + timedelta(hours=int(incident["hours"]))
    task = Task(
        title=incident["title"],
        description=f"Source: {source}. {incident['detail']}",
        owner_id=owner.id,
        deadline=deadline,
        status=TaskStatus.PENDING_ACK.value,
        at_risk=True,
    )
    db.add(task)
    db.flush()
    db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
    db.add(Notification(user_id=owner.id, title=incident["title"], body=f"New {incident['kind']} incident assigned. Due within {incident['hours']} hour(s).", severity="critical", channel="app"))
    for lead in leads_for_alert(db):
        if lead.id != owner.id:
            db.add(Notification(user_id=lead.id, title="Incident routed", body=f"{incident['title']} was assigned to {owner.name} from {source}.", severity="normal", channel="app"))
    return task


def create_ai_routed_task(db: Session, decision: AIRoutingDecision, channel: str) -> Task | None:
    """Validate an AI suggestion against live team state before persisting it."""
    if not decision.needs_task or decision.confidence < 0.6 or not decision.owner_id or not decision.title.strip():
        return None
    owner = db.get(User, decision.owner_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == decision.owner_id, TeamMember.active.is_(True)))
    if not owner or not member:
        return None
    deadline = datetime.now() + timedelta(hours=min(max(decision.deadline_hours, 1), 168))
    task = Task(
        title=decision.title.strip()[:120],
        description=f"AI-routed from {channel}: {decision.description.strip()[:600]}",
        owner_id=owner.id,
        deadline=deadline,
        status=TaskStatus.PENDING_ACK.value,
        at_risk=decision.priority == "critical",
    )
    db.add(task)
    db.flush()
    db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
    db.add(Notification(
        user_id=owner.id,
        title="New AI-routed commitment",
        body=f"{task.title} · {decision.priority.upper()} · Due within {decision.deadline_hours} hour(s).",
        severity="critical" if decision.priority == "critical" else "normal",
        channel="app",
    ))
    for lead in leads_for_alert(db):
        if lead.id != owner.id:
            db.add(Notification(user_id=lead.id, title="AI routed work", body=f"{task.title} was assigned to {owner.name}. {decision.rationale[:180]}", severity="normal", channel="app"))
    return task


def propagate_risk_for_task(db: Session, task: Task, reason: str) -> list[Task]:
    """Mark every downstream task at risk, without looping through dependency cycles."""
    queue = [task.id]
    visited = {task.id}
    affected = []
    while queue:
        prerequisite_id = queue.pop(0)
        deps = list(db.scalars(select(Dependency).where(Dependency.depends_on_task_id == prerequisite_id)))
        for dep in deps:
            if dep.task_id in visited:
                continue
            visited.add(dep.task_id)
            dependent = db.get(Task, dep.task_id)
            if not dependent:
                continue
            dependent.at_risk = True
            db.add(Notification(user_id=dependent.owner_id, title="Task At Risk", body=f"{dependent.title} is AT RISK due to: {reason}", severity="critical", channel="app"))
            affected.append(dependent)
            queue.append(dependent.id)
    return affected


def handle_event(db: Session, event: dict[str, Any]) -> Task | None:
    category = event.get("category", "").casefold()
    summary = event.get("summary", "")
    is_ci_failure = (
        category in {"github", "github_actions", "ci", "ci_failure", "build_failure"}
        or "ci failed" in summary.casefold()
        or "build failed" in summary.casefold()
        or "workflow failed" in summary.casefold()
    )
    incident = classify_incident(summary)
    routed_task = create_routed_incident(db, incident, event.get("source", "event"), event.get("owner_id")) if incident else None
    if is_ci_failure:
        # Try to identify owner by name in summary
        owner_match = re.search(r"Owner:?\s*([A-Za-z][\w-]*)", summary)
        owner = None
        if owner_match:
            owner = member_by_name(db, owner_match.group(1))
        # Fallback: look for a known name in the summary
        if not owner:
            for user in db.scalars(select(User)).all():
                if user.name and user.name.casefold() in summary.casefold():
                    owner = user
                    break
        # If we have an owner, mark their active tasks at risk
        if owner:
            tasks = active_tasks(db, owner.id)
            for task in tasks:
                task.at_risk = True
                db.add(TaskStatusHistory(task_id=task.id, from_status=task.status, to_status=task.status))
                db.add(Notification(user_id=owner.id, title="CI Failure", body=f"{summary} -> {task.title} marked at risk.", severity="critical", channel="app"))
            # Notify leads / Ali
            for lead in leads_for_alert(db):
                db.add(Notification(user_id=lead.id, title="Team CI Failure", body=summary, severity="normal", channel="app"))
        else:
            # No owner identified, create a generic event notification
            for lead in leads_for_alert(db):
                db.add(Notification(user_id=lead.id, title="CI Failure (unowned)", body=summary, severity="normal", channel="app"))
    return routed_task


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
    # ContextFence: detect potential secrets or credential leaks and block storing/displaying them
    if detect_secret(message):
        reply = "A potential secret or credential was detected and blocked. Contact an authorized lead for details."
        remember_summary(db, channel, "<redacted_secret>", {"intent": "CONTEXT_FENCE"}, reply)
        incident_task = create_routed_incident(db, classify_incident(message) or {"kind": "security", "title": "Security exposure review", "role": "security|devops|aws|lead", "detail": "Potential credential exposure detected. The original value was redacted.", "hours": "1"}, channel)
        for lead in leads_for_alert(db):
            db.add(Notification(user_id=lead.id, title="Security alert (blocked)", body="A potential secret was safely blocked by ContextFence.", severity="normal", channel="app"))
        if incident_task:
            reply = f"A potential secret was blocked and a redacted security review was assigned to the appropriate responder."
        db.commit()
        return {"reply": reply, "intent": {"intent": "CONTEXT_FENCE"}}

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
    elif kind == "REPORT_DELAY":
        # Sender reports a delay for a named component/task
        sender = member_by_name(db, sender_name or "")
        # try to find a matching active task by title containing the reported task fragment
        task = None
        if sender:
            for t in active_tasks(db, sender.id):
                if intent.get("task") and intent["task"].casefold() in t.title.casefold():
                    task = t
                    break
        if not task:
            # fallback: any active task with matching title
            for t in active_tasks(db):
                if intent.get("task") and intent["task"].casefold() in t.title.casefold():
                    task = t
                    break
        if not task:
            reply = "I couldn't find the named task to mark delayed."
        else:
            previous = task.status
            task.status = TaskStatus.DELAYED.value
            db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
            reason = f"Reported {intent.get('hours')} hours delay by {sender_name or 'unknown'}"
            affected = propagate_risk_for_task(db, task, reason)
            # Notify task owner
            db.add(Notification(user_id=task.owner_id, title="Task Delayed", body=f"{task.title} marked DELAYED: {reason}", severity="normal", channel="app"))
            # Notify leads with a summary
            for lead in leads_for_alert(db):
                db.add(Notification(user_id=lead.id, title="Dependency risk", body=f"{task.title} delayed -> {len(affected)} downstream tasks at risk.", severity="normal", channel="app"))
            reply = f"{task.title} → {task.status}. Downstream tasks: {len(affected)} marked AT RISK."
    else:
        ai_decision = route_with_gemini(db, message, channel)
        ai_task = create_ai_routed_task(db, ai_decision, channel) if ai_decision else None
        if ai_task:
            owner = db.get(User, ai_task.owner_id)
            reply = f"AI routed {ai_task.title} to {owner.name if owner else 'the response team'} for acknowledgement."
            intent = {"intent": "AI_ROUTE", "category": ai_decision.category, "confidence": ai_decision.confidence, "owner": owner.name if owner else None}
            remember_summary(db, channel, message, intent, reply)
            db.commit()
            return {"reply": reply, "intent": intent}
        incident = classify_incident(message)
        task = create_routed_incident(db, incident, channel) if incident else None
        if task:
            owner = db.get(User, task.owner_id)
            reply = f"{incident['title']} detected and assigned to {owner.name if owner else 'the response team'} for acknowledgement."
            intent = {"intent": "ROUTE_INCIDENT", "category": incident["kind"], "owner": owner.name if owner else None}
        else:
            reply = "I couldn't safely understand that. Try assigning a task with an owner and weekday, or ask for team status."

    remember_summary(db, channel, message, intent, reply)
    db.commit()
    return {"reply": reply, "intent": intent}
