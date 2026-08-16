from contextlib import asynccontextmanager
from os import getenv

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import AuditLog, Connection, Dependency, Event, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, TeamWorkspace, User
from .queue_worker import async_queue
from .schemas import (
    AdminLoginRequest, AdminSendOtpRequest, AdminSignupRequest, AdminVerifyOtpRequest,
    ChatMessage, ConnectionOut, DependencyCreate, EventCreate,
    MemberApprovalAction, MemberCreate, MemberJoinRequest, MemberLoginRequest, MemberOut,
    TaskCreate, TaskOut, TaskUpdate, TeamCodeVerify,
)
from .supabase_auth import (
    admin_login_supabase, admin_signup_supabase,
    send_admin_otp_supabase, verify_admin_otp_supabase,
)
from .teamops import handle_event, leads_for_alert, process_message
from .voice_service import summarize_and_extract_voice_directive, transcribe_audio_groq
from .websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        workspace = db.scalar(select(TeamWorkspace))
        if not workspace:
            db.add(TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026"))
            db.commit()
    async_queue.start()
    yield


app = FastAPI(title="Caspian TeamOps Sentinel", version="0.3.0", lifespan=lifespan)
origins = [item.strip() for item in getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive ping/messages if any
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get("/health")
def health():
    return {"status": "ok"}


# ==================== ADMIN & MEMBER AUTHENTICATION ====================

@app.post("/auth/admin/signup", status_code=201)
async def admin_signup(payload: AdminSignupRequest, db: Session = Depends(get_db)):
    try:
        result = await admin_signup_supabase(
            db=db,
            email=payload.email,
            password=payload.password,
            name=payload.name,
            workspace_name=payload.workspace_name,
        )
        return result
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Signup failed: {str(exc)}")


@app.post("/auth/admin/login")
async def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    try:
        result = await admin_login_supabase(
            db=db,
            email=payload.email,
            password=payload.password,
        )
        return result
    except ValueError as exc:
        raise HTTPException(401, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Login failed: {str(exc)}")


@app.post("/auth/admin/send-otp")
async def admin_send_otp(payload: AdminSendOtpRequest):
    """Send an email verification code / magic OTP via Supabase Auth for passwordless login."""
    try:
        result = await send_admin_otp_supabase(payload.email)
        return result
    except Exception as exc:
        raise HTTPException(500, f"Failed to dispatch verification code: {str(exc)}")


@app.post("/auth/admin/verify-otp")
async def admin_verify_otp(payload: AdminVerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify Supabase email OTP code and authenticate admin (Forgot Password / Passwordless)."""
    try:
        result = await verify_admin_otp_supabase(
            db=db,
            email=payload.email,
            token_code=payload.token_code,
        )
        return result
    except ValueError as exc:
        raise HTTPException(401, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"OTP verification failed: {str(exc)}")


@app.post("/auth/member/login")
def member_login(payload: MemberLoginRequest, db: Session = Depends(get_db)):
    name_clean = payload.name.strip()
    user = db.scalar(select(User).where(User.name.ilike(name_clean)))
    if not user:
        # Fallback search by first name
        user = db.scalar(select(User).where(User.name.ilike(f"{name_clean}%")))
    if not user:
        raise HTTPException(401, "Unknown team member. Join using your Team Code first.")

    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user.id))
    if not member or not member.approved:
        raise HTTPException(403, "Membership pending admin approval. Contact your team admin.")

    # Fetch workspace team code
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.id == member.team_id)) if member.team_id else db.scalar(select(TeamWorkspace))
    team_code = workspace.team_code if workspace else "CASPIAN-2026"
    team_name = workspace.name if workspace else "Caspian Sentinel Team"

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": member.role,
        "team_code": team_code,
        "team_name": team_name,
        "token": f"member-token-{user.id}",
    }


@app.post("/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.name == payload.get("name")))
    if not user:
        raise HTTPException(401, "Unknown team member")
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user.id))
    if member and not member.approved:
        raise HTTPException(403, "Membership pending admin approval")
    return {"user_id": user.id, "name": user.name, "token": f"demo-{user.id}"}


# ==================== TEAM CODE & MEMBER JOIN FLOW ====================

@app.post("/team/verify-code")
def verify_team_code(payload: TeamCodeVerify, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
    if not workspace:
        raise HTTPException(404, "Invalid team code. Contact your admin for the correct invite code.")
    return {"valid": True, "team_name": workspace.name, "team_id": workspace.id}


@app.post("/team/join-request", status_code=201)
async def submit_join_request(payload: MemberJoinRequest, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
    if not workspace:
        raise HTTPException(404, "Invalid team code")
    if db.scalar(select(User).where(User.name.ilike(payload.name.strip()))):
        raise HTTPException(409, "A member with this name already exists")

    user = User(name=payload.name.strip(), email=payload.email.strip())
    db.add(user); db.flush()
    member = TeamMember(
        user_id=user.id,
        role=payload.role.strip(),
        contact=payload.contact.strip() if payload.contact else None,
        skills_description=payload.skills_description.strip() if payload.skills_description else None,
        approved=False,
        active=False,
        team_id=workspace.id,
    )
    db.add(member)
    db.add(AuditLog(action="join_request", entity_type="member", entity_id=user.id, detail=f"Role: {member.role}"))

    # Notify leads
    for lead in leads_for_alert(db):
        db.add(Notification(
            user_id=lead.id,
            title="New Member Join Request",
            body=f"{user.name} ({member.role}) requested to join the team. Click to approve.",
            severity="normal",
            channel="app",
        ))
    db.commit()

    join_data = {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": member.role,
        "contact": member.contact,
        "skills_description": member.skills_description,
        "status": "pending_approval",
    }
    await ws_manager.broadcast("member_join_requested", join_data)
    return {
        "status": "pending_approval",
        "message": f"Join request for {user.name} submitted successfully. Awaiting admin approval.",
        "member": join_data,
    }


@app.get("/members/pending", response_model=list[MemberOut])
def list_pending_members(db: Session = Depends(get_db)):
    rows = db.execute(
        select(User, TeamMember)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(TeamMember.approved.is_(False))
    ).all()
    return [
        MemberOut(
            id=user.id,
            name=user.name,
            email=user.email,
            role=member.role,
            contact=member.contact,
            skills_description=member.skills_description,
            approved=member.approved,
            active=member.active,
        )
        for user, member in rows
    ]


@app.patch("/members/{user_id}/approve", response_model=MemberOut)
async def approve_member(user_id: int, payload: MemberApprovalAction | None = None, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user_id))
    if not user or not member:
        raise HTTPException(404, "Member not found")

    member.approved = True
    member.active = True
    db.add(TaskStatusHistory(task_id=user.id, to_status="APPROVED")) if False else None
    db.add(AuditLog(action="approve", entity_type="member", entity_id=user.id))
    db.add(Notification(
        user_id=user.id,
        title="Membership Approved",
        body="Welcome to the team! Your profile is now active.",
        severity="normal",
        channel="app",
    ))
    db.commit()
    member_out = MemberOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=member.role,
        contact=member.contact,
        skills_description=member.skills_description,
        approved=member.approved,
        active=member.active,
    )
    await ws_manager.broadcast("member_approved", member_out.model_dump())
    return member_out


@app.delete("/members/{user_id}/reject", status_code=204)
async def reject_member(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user_id))
    if not user or not member:
        raise HTTPException(404, "Member not found")
    db.delete(member)
    db.delete(user)
    db.commit()
    await ws_manager.broadcast("member_rejected", {"user_id": user_id})
    return None


@app.get("/team/code")
def get_team_code(db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace))
    if not workspace:
        workspace = TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026")
        db.add(workspace); db.commit(); db.refresh(workspace)
    return {"team_name": workspace.name, "team_code": workspace.team_code}


@app.post("/team/code/regenerate")
def regenerate_team_code(payload: TeamCodeVerify | None = None, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace))
    if not workspace:
        workspace = TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026")
        db.add(workspace)
    import secrets
    workspace.team_code = payload.team_code.strip() if payload and payload.team_code.strip() else f"TEAM-{secrets.token_hex(3).upper()}"
    db.commit(); db.refresh(workspace)
    return {"team_name": workspace.name, "team_code": workspace.team_code}


@app.post("/members", response_model=MemberOut, status_code=201)
def create_member(payload: MemberCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.name == payload.name)):
        raise HTTPException(409, "Member already exists")
    user = User(name=payload.name, email=payload.email)
    db.add(user); db.flush()
    member = TeamMember(
        user_id=user.id,
        role=payload.role,
        contact=payload.contact,
        skills_description=payload.skills_description,
        approved=True,
        active=True,
    )
    db.add(member)
    db.add(AuditLog(action="create", entity_type="member", entity_id=user.id))
    db.commit()
    return MemberOut(id=user.id, **payload.model_dump(), approved=True, active=True)


@app.get("/members", response_model=list[MemberOut])
def list_members(db: Session = Depends(get_db)):
    rows = db.execute(
        select(User, TeamMember)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(TeamMember.active.is_(True), TeamMember.approved.is_(True))
    ).all()
    return [
        MemberOut(
            id=user.id,
            name=user.name,
            email=user.email,
            role=member.role,
            contact=member.contact,
            skills_description=member.skills_description,
            approved=member.approved,
            active=member.active,
        )
        for user, member in rows
    ]


@app.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    if not db.get(User, payload.owner_id):
        raise HTTPException(404, "Owner not found")
    task = Task(**payload.model_dump(), status=TaskStatus.PENDING_ACK.value)
    db.add(task); db.flush()
    db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
    db.add(AuditLog(action="create", entity_type="task", entity_id=task.id))
    db.commit(); db.refresh(task)
    await ws_manager.broadcast("task_created", {"task_id": task.id, "title": task.title, "owner_id": task.owner_id, "status": task.status})
    return task


@app.get("/tasks", response_model=list[TaskOut])
def list_tasks(owner_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Task).order_by(Task.deadline.asc().nullslast(), Task.id.desc())
    if owner_id is not None:
        query = query.where(Task.owner_id == owner_id)
    return list(db.scalars(query))


@app.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    previous = task.status
    task.status = payload.status.value
    db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
    db.add(AuditLog(action="status_change", entity_type="task", entity_id=task.id, detail=f"{previous}->{task.status}"))
    db.commit(); db.refresh(task)
    await ws_manager.broadcast("task_updated", {"task_id": task.id, "title": task.title, "status": task.status, "previous_status": previous})
    return task


@app.post("/events", status_code=201)
async def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(**payload.model_dump()); db.add(event); db.commit(); db.refresh(event)
    routed = handle_event(db, payload.model_dump())
    db.commit()
    await ws_manager.broadcast("event_received", {"event_id": event.id, "category": event.category, "summary": event.summary})
    return event


@app.get("/events")
def list_events(db: Session = Depends(get_db)):
    return list(db.scalars(select(Event).order_by(Event.id.desc()).limit(50)))


@app.get("/connections", response_model=list[ConnectionOut])
def list_connections(db: Session = Depends(get_db)):
    known = {item.channel: item for item in db.scalars(select(Connection)).all()}
    return [known.get(channel) or Connection(channel=channel, status="not_connected", detail="Ready to connect") for channel in ("email", "slack")]


@app.post("/connections/{channel}/start", response_model=ConnectionOut)
def start_connection(channel: str, db: Session = Depends(get_db)):
    if channel not in {"email", "slack"}:
        raise HTTPException(404, "Unsupported channel")
    item = db.scalar(select(Connection).where(Connection.channel == channel)) or Connection(channel=channel)
    if not item.id:
        db.add(item)
    if not getenv("CASPIAN_API_KEY"):
        item.status = "needs_configuration"
        item.detail = "Add CASPIAN_API_KEY and the channel credentials on the server, then retry."
        db.commit(); db.refresh(item)
        return item
    try:
        from caspian_sdk import CommClient
        client = CommClient()
        if channel == "email":
            connection = client.connect_email()
        elif getenv("CASPIAN_SLACK_MODE", "oauth").casefold() == "socket":
            connection = client.connect_slack(bot_token=getenv("SLACK_BOT_TOKEN"), app_token=getenv("SLACK_APP_TOKEN"))
        else:
            connection = client.connect_slack(slack_client_id=getenv("SLACK_CLIENT_ID"), slack_client_secret=getenv("SLACK_CLIENT_SECRET"), slack_signing_secret=getenv("SLACK_SIGNING_SECRET"))
        item.status = str(connection.get("status", "provisioning"))
        item.external_id = connection.get("id")
        item.setup_url = connection.get("authorize_url")
        item.detail = "Continue in the browser to approve the workspace." if item.setup_url else "Connection request sent."
        client.close()
    except Exception as exc:
        item.status = "needs_configuration"
        item.detail = f"Connection could not start: {str(exc)[:180]}"
    db.commit(); db.refresh(item)
    return item


@app.post("/dependencies", status_code=201)
def create_dependency(payload: DependencyCreate, db: Session = Depends(get_db)):
    if payload.task_id == payload.depends_on_task_id:
        raise HTTPException(400, "A task cannot depend on itself")
    if not db.get(Task, payload.task_id) or not db.get(Task, payload.depends_on_task_id):
        raise HTTPException(404, "Task not found")
    if db.scalar(select(Dependency).where(Dependency.task_id == payload.task_id, Dependency.depends_on_task_id == payload.depends_on_task_id)):
        raise HTTPException(409, "Dependency already exists")
    seen = {payload.task_id}
    frontier = [payload.depends_on_task_id]
    while frontier:
        current = frontier.pop()
        if current in seen:
            raise HTTPException(400, "Dependency would create a cycle")
        seen.add(current)
        frontier.extend(db.scalars(select(Dependency.depends_on_task_id).where(Dependency.task_id == current)).all())
    item = Dependency(**payload.model_dump()); db.add(item); db.commit(); db.refresh(item)
    return item


@app.get("/dependencies")
def list_dependencies(db: Session = Depends(get_db)):
    return list(db.scalars(select(Dependency)))


@app.get("/team/status")
def team_status(db: Session = Depends(get_db)):
    tasks = list(db.scalars(select(Task)))
    return {
        "total": len(tasks),
        "pending_ack": sum(t.status == "PENDING_ACK" for t in tasks),
        "blocked": sum(t.status == "BLOCKED" for t in tasks),
        "delayed": sum(t.status == "DELAYED" for t in tasks),
        "at_risk": sum(t.at_risk for t in tasks),
        "done": sum(t.status == "DONE" for t in tasks),
    }


@app.post("/chat")
async def chat(payload: ChatMessage, db: Session = Depends(get_db)):
    result = process_message(db, payload.message, payload.sender_name, payload.channel)
    await ws_manager.broadcast("chat_message", {"sender": payload.sender_name, "channel": payload.channel, "result": result})
    return result


@app.post("/chat/async")
async def chat_async(payload: ChatMessage):
    """Enqueue message for non-blocking asynchronous processing via background worker."""
    await async_queue.enqueue(
        message=payload.message,
        sender_name=payload.sender_name,
        channel=payload.channel,
    )
    return {"status": "enqueued", "channel": payload.channel, "sender": payload.sender_name}


@app.post("/audio/transcribe-and-route")
async def transcribe_and_route(
    file: UploadFile = File(...),
    sender_name: str = Form("Admin"),
    mock_transcript: str | None = Form(None),
    db: Session = Depends(get_db)
):
    """Upload voice note audio, transcribe via Groq Whisper, summarize with Gemini, and route task."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Empty audio file received")
    if mock_transcript:
        transcript = mock_transcript
    else:
        try:
            transcript = transcribe_audio_groq(file_bytes, filename=file.filename or "voice_note.wav")
            if not transcript:
                transcript = "Voice memo received."
        except Exception as exc:
            raise HTTPException(502, f"Voice transcription failed: {str(exc)}")

    result = summarize_and_extract_voice_directive(db, transcript, sender_name=sender_name)
    await ws_manager.broadcast("voice_note_processed", result)
    return result


@app.get("/notifications")
def notifications(user_id: int | None = None, unread_only: bool = False, db: Session = Depends(get_db)):
    query = select(Notification).order_by(Notification.id.desc())
    if user_id is not None:
        query = query.where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.read.is_(False))
    return list(db.scalars(query.limit(100)))


@app.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: int, db: Session = Depends(get_db)):
    item = db.get(Notification, notification_id)
    if not item:
        raise HTTPException(404, "Notification not found")
    item.read = True
    db.commit(); db.refresh(item)
    return item
