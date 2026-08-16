import os
from contextlib import asynccontextmanager
from os import getenv

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db, init_db
from .models import AuditLog, Connection, Dependency, Event, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, TeamWorkspace, User
from .queue_worker import async_queue
from .schemas import (
    AdminLoginRequest, AdminMemberCreate, AdminSendOtpRequest, AdminSignupRequest, AdminVerifyOtpRequest,
    ChatMessage, ConnectionOut, DependencyCreate, DirectMessageCreate, EventCreate,
    MemberApprovalAction, MemberCreate, MemberJoinRequest, MemberLoginRequest, MemberOut,
    TaskCreate, TaskOut, TaskUpdate, TeamCodeVerify, TTSRequest,
)
from .supabase_auth import (
    admin_login_supabase, admin_signup_supabase,
    send_admin_otp_supabase, verify_admin_otp_supabase,
)
from .teamops import handle_event, leads_for_alert, process_message
from .tts_service import synthesize_speech
from .voice_service import preview_and_extract_voice_directive, summarize_and_extract_voice_directive, transcribe_audio_groq
from .websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as db:
        workspace = db.scalar(select(TeamWorkspace))
        if not workspace:
            db.add(TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026"))
            db.commit()
    async_queue.start()
    if getenv("CASPIAN_API_KEY") and "PYTEST_CURRENT_TEST" not in os.environ:
        import threading
        from .caspian_bridge import run_listener
        threading.Thread(target=run_listener, daemon=True, name="CaspianListener").start()
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
    code_clean = (payload.team_code or "").strip()
    if not code_clean:
        raise HTTPException(400, "Team code is required to log in as a team member.")
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(code_clean)))
    if not workspace:
        raise HTTPException(404, "Invalid team code.")

    user = db.scalar(
        select(User)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(User.name.ilike(name_clean), TeamMember.team_id == workspace.id)
    )
    if not user:
        user = db.scalar(
            select(User)
            .join(TeamMember, TeamMember.user_id == User.id)
            .where(User.name.ilike(f"{name_clean}%"), TeamMember.team_id == workspace.id)
        )
    if not user:
        raise HTTPException(401, "Unknown team member. Join using your Team Code first.")

    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user.id))
    if not member or not member.approved or not member.active:
        raise HTTPException(403, "Membership pending admin approval. Contact your team admin.")

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": member.role,
        "team_code": workspace.team_code,
        "team_name": workspace.name,
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

    clean_email = payload.email.strip().lower()
    clean_name = payload.name.strip()

    # Check if a user with this email already exists
    user = db.scalar(select(User).where(User.email == clean_email))
    if not user:
        user = User(name=clean_name, email=clean_email)
        db.add(user)
        db.flush()
    else:
        user.name = clean_name

    # Check if a membership record exists for this user in this workspace
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.team_id == workspace.id))
    if member:
        if member.approved and member.active:
            raise HTTPException(409, f"{clean_name} is already an active approved member of this workspace.")
        # Update existing pending request details
        member.role = payload.role.strip()
        member.contact = payload.contact.strip() if payload.contact else member.contact
        member.skills_description = payload.skills_description.strip() if payload.skills_description else member.skills_description
    else:
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

    # Notify only the admin who owns this workspace.
    if workspace.admin_id:
        db.add(Notification(
            user_id=workspace.admin_id,
            title="New Member Join Request",
            body=f"{user.name} ({member.role}) requested to join {workspace.name}. Click to approve.",
            severity="normal",
            channel="app",
        ))
    db.commit()
    db.refresh(user)
    db.refresh(member)

    join_data = {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": member.role,
        "contact": member.contact,
        "skills_description": member.skills_description,
        "status": "pending_approval",
    }
    await ws_manager.broadcast("member_join_requested", {**join_data, "team_id": workspace.id})
    return {
        "status": "pending_approval",
        "message": f"Join request for {user.name} submitted successfully. Awaiting admin approval.",
        "member": join_data,
    }


@app.get("/members/pending", response_model=list[MemberOut])
def list_pending_members(team_code: str, db: Session = Depends(get_db)):
    try:
        workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip())))
        if not workspace:
            return []
        rows = db.execute(
            select(User, TeamMember)
            .join(TeamMember, TeamMember.user_id == User.id)
            .where(TeamMember.approved.is_(False), TeamMember.team_id == workspace.id)
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
    except Exception as exc:
        print("list_pending_members notice:", exc)
        return []


@app.patch("/members/{user_id}/approve", response_model=MemberOut)
async def approve_member(user_id: int, payload: MemberApprovalAction | None = None, db: Session = Depends(get_db)):
    if payload is None:
        raise HTTPException(400, "Team code is required")
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
    user = db.get(User, user_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user_id))
    if not workspace or not user or not member or member.team_id != workspace.id:
        raise HTTPException(404, "Member not found in this workspace")

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
async def reject_member(user_id: int, team_code: str, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip())))
    user = db.get(User, user_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user_id))
    if not workspace or not user or not member or member.team_id != workspace.id:
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
    workspace = db.scalar(select(TeamWorkspace))
    member = TeamMember(
        user_id=user.id,
        role=payload.role,
        contact=payload.contact,
        skills_description=payload.skills_description,
        approved=True,
        active=True,
        team_id=workspace.id if workspace else None,
    )
    db.add(member)
    db.add(AuditLog(action="create", entity_type="member", entity_id=user.id))
    db.commit()
    return MemberOut(id=user.id, **payload.model_dump(), approved=True, active=True)


@app.post("/team/members", response_model=MemberOut, status_code=201)
async def admin_add_member(payload: AdminMemberCreate, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    email = payload.email.strip().lower() if payload.email else None
    existing_user = db.scalar(select(User).where(User.name.ilike(payload.name.strip())))
    if not existing_user and email:
        existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        existing_member = db.scalar(select(TeamMember).where(TeamMember.user_id == existing_user.id))
        if existing_member and existing_member.team_id == workspace.id and not existing_member.active:
            existing_user.name = payload.name.strip()
            existing_user.email = email
            existing_member.role = payload.role.strip()
            existing_member.contact = payload.contact.strip() if payload.contact else None
            existing_member.skills_description = payload.skills_description.strip() if payload.skills_description else None
            existing_member.approved = True
            existing_member.active = True
            db.add(AuditLog(action="admin_restore_member", entity_type="member", entity_id=existing_user.id, detail=f"Workspace {workspace.id}"))
            db.commit()
            result = MemberOut(
                id=existing_user.id, name=existing_user.name, email=existing_user.email,
                role=existing_member.role, contact=existing_member.contact,
                skills_description=existing_member.skills_description, approved=True, active=True,
            )
            await ws_manager.broadcast("member_added", {**result.model_dump(), "team_id": workspace.id})
            return result
        raise HTTPException(409, "A member with this name or email already exists")
    user = User(name=payload.name.strip(), email=email)
    db.add(user); db.flush()
    member = TeamMember(
        user_id=user.id,
        role=payload.role.strip(),
        contact=payload.contact.strip() if payload.contact else None,
        skills_description=payload.skills_description.strip() if payload.skills_description else None,
        approved=True,
        active=True,
        team_id=workspace.id,
    )
    db.add(member)
    db.add(AuditLog(action="admin_add_member", entity_type="member", entity_id=user.id, detail=f"Workspace {workspace.id}"))
    db.commit()
    result = MemberOut(
        id=user.id, name=user.name, email=user.email, role=member.role,
        contact=member.contact, skills_description=member.skills_description,
        approved=True, active=True,
    )
    await ws_manager.broadcast("member_added", {**result.model_dump(), "team_id": workspace.id})
    return result


@app.delete("/team/members/{user_id}", status_code=204)
async def admin_remove_member(user_id: int, team_code: str, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip())))
    user = db.get(User, user_id)
    member = db.scalar(select(TeamMember).where(TeamMember.user_id == user_id))
    if not workspace or not user or not member or member.team_id != workspace.id:
        raise HTTPException(404, "Member not found in this workspace")
    if workspace.admin_id == user_id or "admin" in (member.role or "").casefold():
        raise HTTPException(400, "The workspace owner cannot be removed")
    # Keep completed work and audit history while revoking workspace access.
    member.active = False
    db.add(AuditLog(action="admin_remove_member", entity_type="member", entity_id=user_id, detail=f"Workspace {workspace.id}"))
    db.commit()
    await ws_manager.broadcast("member_removed", {"user_id": user_id, "team_id": workspace.id})
    return None


@app.get("/members", response_model=list[MemberOut])
def list_members(team_code: str | None = None, db: Session = Depends(get_db)):
    try:
        workspace = None
        if team_code:
            workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip())))
            if not workspace:
                return []
        rows = db.execute(
            select(User, TeamMember)
            .join(TeamMember, TeamMember.user_id == User.id)
            .where(
                TeamMember.active.is_(True),
                TeamMember.approved.is_(True),
                *( [TeamMember.team_id == workspace.id] if workspace else [] ),
            )
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
    except Exception as exc:
        print("list_members notice:", exc)
        return []


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
def list_tasks(owner_id: int | None = None, team_code: str | None = None, db: Session = Depends(get_db)):
    try:
        query = select(Task).order_by(Task.deadline.asc().nullslast(), Task.id.desc())
        if team_code:
            workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(team_code.strip())))
            if not workspace:
                return []
            member_ids = select(TeamMember.user_id).where(TeamMember.team_id == workspace.id)
            query = query.where(Task.owner_id.in_(member_ids))
        if owner_id is not None:
            query = query.where(Task.owner_id == owner_id)
        return list(db.scalars(query))
    except Exception as exc:
        print("list_tasks notice:", exc)
        return []


class TaskResponseAction(BaseModel):
    action: str  # "accept" | "reject"
    reason: str | None = None
    user_id: int | None = None


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


@app.patch("/tasks/{task_id}/respond", response_model=TaskOut)
async def respond_to_task(task_id: int, payload: TaskResponseAction, db: Session = Depends(get_db)):
    """Allow assigned team member to approve (accept) or reject task with a mandatory reason."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    user = None
    if payload.user_id:
        user = db.get(User, payload.user_id)
    if not user:
        user = db.get(User, task.owner_id)

    user_name = user.name if user else f"Member #{task.owner_id}"
    previous = task.status
    action = payload.action.lower().strip()

    if action in {"accept", "approve"}:
        task.status = TaskStatus.IN_PROGRESS.value
        db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
        db.add(AuditLog(action="task_accepted", entity_type="task", entity_id=task.id, detail=f"Accepted by {user_name}"))
        
        # Notify Admins / Workspace Leads
        admin_user = db.scalar(select(User).where(User.name == "Admin"))
        if admin_user and admin_user.id != task.owner_id:
            db.add(Notification(
                user_id=admin_user.id,
                title="Task Accepted",
                body=f"✓ {user_name} accepted: '{task.title}'",
                severity="normal",
                channel="app",
            ))
        db.commit(); db.refresh(task)
        await ws_manager.broadcast("task_updated", {
            "task_id": task.id,
            "title": task.title,
            "status": task.status,
            "action": "accept",
            "user_name": user_name,
        })
        return task

    elif action in {"complete", "done", "resolve"}:
        solution = (payload.reason or "").strip()
        if not solution:
            raise HTTPException(400, "Please provide details explaining how this task was resolved.")

        task.status = TaskStatus.DONE.value
        solution_tag = f"[RESOLVED by {user_name}]: {solution}"
        task.description = f"{solution_tag}\n{task.description or ''}".strip()

        db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
        db.add(AuditLog(action="task_completed", entity_type="task", entity_id=task.id, detail=solution))

        # Notify Admin / Leads with the resolution details
        for admin_user in db.scalars(select(User)).all():
            db.add(Notification(
                user_id=admin_user.id,
                title=f"🎉 Task Solved: {task.title[:40]}",
                body=f"{user_name} marked this task done.\nSolution: \"{solution}\"",
                severity="normal",
                channel="app",
            ))
        db.commit(); db.refresh(task)
        await ws_manager.broadcast("task_updated", {
            "task_id": task.id,
            "title": task.title,
            "status": task.status,
            "action": "complete",
            "solution": solution,
            "user_name": user_name,
        })
        return task

    elif action in {"reject", "decline"}:
        reason = (payload.reason or "").strip()
        if not reason:
            raise HTTPException(400, "A valid reason is required when rejecting a task")

        task.status = TaskStatus.CANCELLED.value
        # Append rejection reason to task description for record keeping
        reason_tag = f"[REJECTED by {user_name}]: {reason}"
        task.description = f"{reason_tag}\n{task.description or ''}".strip()

        db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
        db.add(AuditLog(action="task_rejected", entity_type="task", entity_id=task.id, detail=reason))

        # Send CRITICAL notification to Admin / Leads explaining why they could not do the task
        for admin_user in db.scalars(select(User)).all():
            db.add(Notification(
                user_id=admin_user.id,
                title=f"⚠️ Task Rejected: {task.title[:40]}",
                body=f"{user_name} is unable to complete this task.\nReason: \"{reason}\"",
                severity="critical",
                channel="app",
            ))
        db.commit(); db.refresh(task)
        await ws_manager.broadcast("task_rejected", {
            "task_id": task.id,
            "title": task.title,
            "status": task.status,
            "action": "reject",
            "reason": reason,
            "user_name": user_name,
        })
        return task

    else:
        raise HTTPException(400, f"Unknown action '{payload.action}'. Use 'accept', 'reject', or 'complete'.")


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
    if getenv("CASPIAN_API_KEY"):
        try:
            from caspian_sdk import CommClient
            api_key = getenv("CASPIAN_API_KEY")
            base_url = getenv("CASPIAN_BASE_URL", "https://api.trycaspianai.com")
            client = CommClient(api_key=api_key, base_url=base_url)
            live_conns = client.list_connections()
            for c in live_conns:
                ch = c.get("channel")
                if ch in ("email", "slack"):
                    item = db.scalar(select(Connection).where(Connection.channel == ch))
                    if not item:
                        item = Connection(channel=ch)
                        db.add(item)
                    if c.get("status") == "active":
                        item.status = "active"
                        item.external_id = c.get("id")
                        addr = c.get("address") or c.get("id")
                        item.detail = f"Connected: {addr}"
                        if ch == "email":
                            item.setup_url = f"mailto:{addr}"
            db.commit()
            client.close()
        except Exception:
            db.rollback()
    try:
        known = {item.channel: item for item in db.scalars(select(Connection)).all()}
    except Exception:
        db.rollback()
        known = {}
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
        item.detail = "Add CASPIAN_API_KEY and channel credentials on server, or use 1-click install."
        db.commit(); db.refresh(item)
        return item
    try:
        from caspian_sdk import CommClient
        client = CommClient()
        if channel == "email":
            connection = client.connect_email(username="sentinel")
        elif getenv("CASPIAN_SLACK_MODE", "oauth").casefold() == "socket":
            connection = client.connect_slack(bot_token=getenv("SLACK_BOT_TOKEN"), app_token=getenv("SLACK_APP_TOKEN"))
        else:
            connection = client.install_slack(display_name="Caspian Sentinel")
        item.status = str(connection.get("status", "provisioning"))
        item.external_id = connection.get("id")
        item.setup_url = connection.get("authorize_url") or connection.get("address")
        item.detail = "Click to authorize in your Slack workspace." if item.setup_url else f"Connected: {connection.get('address', 'active')}"
        client.close()
    except Exception as exc:
        item.status = "needs_configuration"
        item.detail = f"Connection could not start: {str(exc)[:180]}"
    db.commit(); db.refresh(item)
    return item


@app.post("/connections/slack/one-click", response_model=ConnectionOut)
def one_click_slack(db: Session = Depends(get_db)):
    """1-Click Slack App Installation using Caspian SDK shared app."""
    item = db.scalar(select(Connection).where(Connection.channel == "slack")) or Connection(channel="slack")
    if not item.id:
        db.add(item)
    if not getenv("CASPIAN_API_KEY"):
        item.status = "ready_for_auth"
        item.setup_url = "https://slack.com/oauth/v2/authorize"
        item.detail = "Ready for 1-click Slack workspace connection."
        db.commit(); db.refresh(item)
        return item
    try:
        from caspian_sdk import CommClient
        client = CommClient()
        conn = client.install_slack(display_name="Caspian Sentinel AI")
        item.status = str(conn.get("status", "pending_install"))
        item.external_id = conn.get("id")
        item.setup_url = conn.get("authorize_url")
        item.detail = "Authorize Caspian Sentinel AI to receive messages in your Slack workspace."
        client.close()
    except Exception as exc:
        item.status = "error"
        item.detail = f"1-Click Slack error: {str(exc)[:180]}"
    db.commit(); db.refresh(item)
    return item


@app.post("/connections/email/one-click", response_model=ConnectionOut)
def one_click_email(db: Session = Depends(get_db)):
    """1-Click Email Inbox Connection using Caspian SDK."""
    item = db.scalar(select(Connection).where(Connection.channel == "email")) or Connection(channel="email")
    if not item.id:
        db.add(item)
    if not getenv("CASPIAN_API_KEY"):
        item.status = "active"
        item.setup_url = "mailto:sentinel@caspianteam.io"
        item.detail = "Inbound Email inbox active: sentinel@caspianteam.io"
        db.commit(); db.refresh(item)
        return item
    try:
        from caspian_sdk import CommClient
        api_key = getenv("CASPIAN_API_KEY")
        base_url = getenv("CASPIAN_BASE_URL", "https://api.trycaspianai.com")
        client = CommClient(api_key=api_key, base_url=base_url)
        try:
            conn = client.connect_email(username="sentinel-teamops")
        except Exception:
            conn = client.connect_email()
        item.status = str(conn.get("status", "active"))
        item.external_id = conn.get("id")
        item.setup_url = f"mailto:{conn.get('address', 'sentinel-teamops@agents.trycaspianai.com')}"
        item.detail = f"Inbound email routed to TeamOps: {conn.get('address')}"
        client.close()
    except Exception as exc:
        item.status = "error"
        item.detail = f"Email connect error: {str(exc)[:180]}"
    db.commit(); db.refresh(item)
    return item



@app.post("/webhooks/caspian")
async def caspian_webhook(request: Request, db: Session = Depends(get_db)):
    """Process real-time multi-channel webhooks (Slack, Email, Discord) through TeamOps."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    message_text = body.get("text") or (body.get("message") or {}).get("text") or ""
    sender_data = body.get("sender") or {}
    sender_name = sender_data.get("name") or sender_data.get("email") or "External User"
    channel = body.get("channel") or "slack"

    if not message_text:
        return {"status": "ignored", "reason": "empty message"}

    result = process_message(db, message_text, sender_name=sender_name, channel=channel)
    await ws_manager.broadcast("caspian_signal_processed", {
        "channel": channel,
        "sender": sender_name,
        "result": result,
    })
    return {"status": "processed", "channel": channel, "result": result}



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
    result = process_message(db, payload.message, payload.sender_name, payload.channel, team_code=payload.team_code)
    await ws_manager.broadcast("chat_message", {"sender": payload.sender_name, "channel": payload.channel, "result": result})
    return result


@app.post("/messages/direct", status_code=201)
async def send_direct_message(payload: DirectMessageCreate, db: Session = Depends(get_db)):
    workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
    sender_member = db.scalar(select(TeamMember).where(TeamMember.user_id == payload.sender_id))
    recipient_member = db.scalar(select(TeamMember).where(TeamMember.user_id == payload.recipient_id))
    sender = db.get(User, payload.sender_id)
    recipient = db.get(User, payload.recipient_id)
    if (
        not workspace or not sender or not recipient or not sender_member or not recipient_member
        or sender_member.team_id != workspace.id or recipient_member.team_id != workspace.id
        or not recipient_member.active or not recipient_member.approved
    ):
        raise HTTPException(404, "Sender or recipient was not found in this workspace")
    message = payload.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")
    notification = Notification(
        user_id=recipient.id,
        title=f"Message from {sender.name}",
        body=message,
        severity="normal",
        channel="app",
    )
    db.add(notification)
    db.add(AuditLog(action="direct_message", entity_type="user", entity_id=recipient.id, detail=f"From user {sender.id}"))
    db.commit(); db.refresh(notification)
    await ws_manager.broadcast("direct_message", {"recipient_id": recipient.id, "sender": sender.name})
    return {"status": "sent", "notification_id": notification.id, "recipient": recipient.name}


@app.post("/chat/async")
async def chat_async(payload: ChatMessage):
    """Enqueue message for non-blocking asynchronous processing via background worker."""
    await async_queue.enqueue(
        message=payload.message,
        sender_name=payload.sender_name,
        channel=payload.channel,
    )
    return {"status": "enqueued", "channel": payload.channel, "sender": payload.sender_name}


class AnalyzeDirectiveRequest(BaseModel):
    transcript: str
    sender_name: str = "Admin"
    team_code: str | None = None


class ConfirmTransferRequest(BaseModel):
    title: str
    owner_id: int
    deadline_iso: str | None = None
    description: str | None = None
    priority: str | None = "normal"
    team_code: str | None = None


@app.post("/audio/analyze-directive")
def analyze_directive(payload: AnalyzeDirectiveRequest, db: Session = Depends(get_db)):
    """Analyze speech in real-time, generate summary, and preview recipient transfer before sending."""
    text_content = payload.transcript.strip()
    if not text_content:
        raise HTTPException(400, "Speech transcript is empty")
    return preview_and_extract_voice_directive(
        db, text_content, sender_name=payload.sender_name, team_code=payload.team_code
    )


@app.post("/audio/transcribe-voice")
async def transcribe_voice(
    file: UploadFile = File(...),
):
    """Transcribe raw audio recording chunks using Groq Whisper model."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Audio recording is empty")
    try:
        transcript = transcribe_audio_groq(file_bytes, filename=file.filename or "recording.webm")
        return {"transcript": transcript}
    except Exception as exc:
        raise HTTPException(500, f"Whisper transcription failed: {exc}")


@app.post("/audio/confirm-transfer")
async def confirm_transfer(payload: ConfirmTransferRequest, db: Session = Depends(get_db)):
    """Confirm and create task for the target recipient after admin approves transfer."""
    from datetime import datetime, timedelta
    
    owner = None
    if payload.owner_id:
        owner = db.get(User, payload.owner_id)
    if not owner and payload.team_code:
        workspace = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code.ilike(payload.team_code.strip())))
        if workspace:
            owner = db.scalar(
                select(User)
                .join(TeamMember, TeamMember.user_id == User.id)
                .where(TeamMember.team_id == workspace.id, TeamMember.approved.is_(True))
            )
    if not owner:
        owner = db.scalar(select(User))
    if not owner:
        owner = User(name="Admin", email="admin@caspian.ai")
        db.add(owner)
        db.flush()
    
    deadline = None
    if payload.deadline_iso:
        try:
            deadline = datetime.fromisoformat(payload.deadline_iso)
        except Exception:
            deadline = datetime.now() + timedelta(days=1)
    else:
        deadline = datetime.now() + timedelta(days=1)

    task = Task(
        title=payload.title.strip() if payload.title else "Voice Directive Task",
        description=payload.description.strip() if payload.description else "Assigned via Voice Directive",
        owner_id=owner.id,
        deadline=deadline,
        status=TaskStatus.PENDING_ACK.value,
        at_risk=(payload.priority == "critical"),
    )
    db.add(task)
    db.flush()
    db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
    db.add(Notification(
        user_id=owner.id,
        title=f"Voice Directive Assigned: {task.title}",
        body=f"Task assigned to you. Due {task.deadline:%A, %d %b at %I:%M %p}. Awaiting acknowledgement.",
        severity="critical" if payload.priority == "critical" else "normal",
        channel="app"
    ))
    db.add(AuditLog(action="voice_transfer_assigned", entity_type="task", entity_id=task.id, detail=f"Assigned to {owner.name}"))
    db.commit()
    db.refresh(task)
    await ws_manager.broadcast("task_created", {
        "task_id": task.id,
        "title": task.title,
        "owner_id": task.owner_id,
        "status": task.status,
        "owner_name": owner.name,
    })
    return {
        "status": "assigned",
        "task_id": task.id,
        "title": task.title,
        "owner_id": owner.id,
        "owner_name": owner.name,
        "deadline": task.deadline.strftime("%A, %d %b at %I:%M %p"),
        "message": f"Task successfully transferred and assigned to {owner.name}!"
    }


class STTDirectiveRequest(BaseModel):
    transcript: str
    sender_name: str = "Admin"
    team_code: str | None = None


@app.post("/audio/stt-route")
async def stt_route(payload: STTDirectiveRequest, db: Session = Depends(get_db)):
    """Process live speech-to-text transcript through AI routing and TeamOps."""
    text_content = payload.transcript.strip()
    if not text_content:
        raise HTTPException(400, "Speech transcript is empty")
    result = summarize_and_extract_voice_directive(db, text_content, sender_name=payload.sender_name, team_code=payload.team_code)
    await ws_manager.broadcast("voice_note_processed", result)
    return result


@app.post("/audio/transcribe-and-route")
async def transcribe_and_route(
    file: UploadFile | None = File(None),
    sender_name: str = Form("Admin"),
    team_code: str | None = Form(None),
    mock_transcript: str | None = Form(None),
    transcript: str | None = Form(None),
    db: Session = Depends(get_db)
):
    """Upload voice note audio or transcript, transcribe via Whisper/STT, and route task."""
    actual_transcript = ""
    file_info = None

    if file and file.filename:
        file_bytes = await file.read()
        if file_bytes:
            file_info = {
                "filename": file.filename or "voice_note.wav",
                "content_type": file.content_type or "application/octet-stream",
                "size_bytes": len(file_bytes),
            }
            if mock_transcript or transcript:
                actual_transcript = (mock_transcript or transcript or "").strip()
            else:
                try:
                    actual_transcript = transcribe_audio_groq(file_bytes, filename=file.filename or "voice_note.wav")
                except Exception as exc:
                    actual_transcript = "Spoken voice directive received."

    if not actual_transcript:
        actual_transcript = (mock_transcript or transcript or "").strip()

    if not actual_transcript:
        actual_transcript = "Voice memo processed."

    result = summarize_and_extract_voice_directive(db, actual_transcript, sender_name=sender_name, team_code=team_code)
    if file_info:
        result["audio"] = file_info
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


@app.post("/voice/tts")
def text_to_speech(payload: TTSRequest):
    """Synthesize text into audible MP3 speech via gTTS."""
    try:
        audio_bytes = synthesize_speech(payload.text, lang=payload.lang)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as exc:
        raise HTTPException(500, f"TTS synthesis failed: {str(exc)}")


@app.get("/tasks/{task_id}/audio")
def get_task_audio(task_id: int, db: Session = Depends(get_db)):
    """Generate audible task summary briefing."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    owner = db.get(User, task.owner_id)
    owner_name = owner.name if owner else f"User {task.owner_id}"
    deadline_str = task.deadline.strftime("%A at %I:%M %p") if task.deadline else "no deadline specified"
    desc_str = f" Details: {task.description}." if task.description else ""
    briefing = f"Task briefing for {task.title}. Status is {task.status.replace('_', ' ')}. Assigned to {owner_name}. Deadline is {deadline_str}.{desc_str}"
    audio_bytes = synthesize_speech(briefing)
    return Response(content=audio_bytes, media_type="audio/mpeg")

