from datetime import datetime

from pydantic import BaseModel, ConfigDict

from .models import TaskStatus


class MemberCreate(BaseModel):
    name: str
    role: str
    email: str | None = None


class MemberOut(MemberCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str
    owner_id: int
    description: str | None = None
    deadline: datetime | None = None


class TaskUpdate(BaseModel):
    status: TaskStatus


class TaskOut(TaskCreate):
    id: int
    status: TaskStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EventCreate(BaseModel):
    source: str
    category: str
    summary: str
    owner_id: int | None = None


class ChatMessage(BaseModel):
    message: str
    sender_name: str | None = None
    channel: str = "app"


class ExtractedIntent(BaseModel):
    intent: str
    owner: str | None = None
    task: str | None = None
    deadline: datetime | None = None
    status: TaskStatus | None = None
    confidence: float = 1.0


class DependencyCreate(BaseModel):
    task_id: int
    depends_on_task_id: int
