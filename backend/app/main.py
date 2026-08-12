from contextlib import asynccontextmanager
from os import getenv

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import AuditLog, Connection, Dependency, Event, Notification, Task, TaskStatus, TaskStatusHistory, TeamMember, User
from .schemas import ChatMessage, ConnectionOut, DependencyCreate, EventCreate, MemberCreate, MemberOut, TaskCreate, TaskOut, TaskUpdate
from .teamops import process_message, handle_event


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Caspian TeamOps Sentinel", version="0.1.0", lifespan=lifespan)
origins = [item.strip() for item in getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.name == payload.get("name")))
    if not user:
        raise HTTPException(401, "Unknown team member")
    return {"user_id": user.id, "name": user.name, "token": f"demo-{user.id}"}


@app.post("/members", response_model=MemberOut, status_code=201)
def create_member(payload: MemberCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.name == payload.name)):
        raise HTTPException(409, "Member already exists")
    user = User(name=payload.name, email=payload.email)
    db.add(user); db.flush()
    db.add(TeamMember(user_id=user.id, role=payload.role))
    db.add(AuditLog(action="create", entity_type="member", entity_id=user.id))
    db.commit()
    return MemberOut(id=user.id, **payload.model_dump())


@app.get("/members", response_model=list[MemberOut])
def list_members(db: Session = Depends(get_db)):
    rows = db.execute(select(User, TeamMember).join(TeamMember, TeamMember.user_id == User.id)).all()
    return [MemberOut(id=user.id, name=user.name, email=user.email, role=member.role) for user, member in rows]


@app.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    if not db.get(User, payload.owner_id):
        raise HTTPException(404, "Owner not found")
    task = Task(**payload.model_dump(), status=TaskStatus.PENDING_ACK.value)
    db.add(task); db.flush()
    db.add(TaskStatusHistory(task_id=task.id, to_status=task.status))
    db.add(AuditLog(action="create", entity_type="task", entity_id=task.id))
    db.commit(); db.refresh(task)
    return task


@app.get("/tasks", response_model=list[TaskOut])
def list_tasks(owner_id: int | None = None, db: Session = Depends(get_db)):
    query = select(Task).order_by(Task.deadline.asc().nullslast(), Task.id.desc())
    if owner_id is not None:
        query = query.where(Task.owner_id == owner_id)
    return list(db.scalars(query))


@app.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    previous = task.status
    task.status = payload.status.value
    db.add(TaskStatusHistory(task_id=task.id, from_status=previous, to_status=task.status))
    db.add(AuditLog(action="status_change", entity_type="task", entity_id=task.id, detail=f"{previous}->{task.status}"))
    db.commit(); db.refresh(task)
    return task


@app.post("/events", status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(**payload.model_dump()); db.add(event); db.commit(); db.refresh(event)
    handle_event(db, payload.model_dump())
    db.commit()
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
    # A dependency from A -> B means A waits for B. Reject cycles before persisting.
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
def chat(payload: ChatMessage, db: Session = Depends(get_db)):
    return process_message(db, payload.message, payload.sender_name, payload.channel)


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
