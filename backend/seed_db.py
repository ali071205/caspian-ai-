import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from datetime import datetime, timedelta
from app.database import engine, SessionLocal, Base
from app.models import User, TeamMember, Task, TeamWorkspace

Base.metadata.create_all(engine)
db = SessionLocal()

ws = db.query(TeamWorkspace).first()
if not ws:
    ws = TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026")
    db.add(ws)
    db.flush()

members_info = [
    ("Ali", "ali@company.com", "Admin / Workspace Owner"),
    ("Kevin", "kevin@company.com", "Backend Engineer"),
    ("Antony Jacob", "antony@company.com", "Product Lead"),
    ("Leslie Alexander", "leslie@company.com", "UI Designer"),
    ("Wade Warren", "wade@company.com", "UX Researcher"),
]

for name, email, role in members_info:
    u = db.query(User).filter_by(name=name).first()
    if not u:
        u = User(name=name, email=email)
        db.add(u)
        db.flush()
    tm = db.query(TeamMember).filter_by(user_id=u.id).first()
    if not tm:
        tm = TeamMember(user_id=u.id, role=role, approved=True, active=True, team_id=ws.id)
        db.add(tm)

# Demo tasks
u_antony = db.query(User).filter_by(name="Antony Jacob").first()
u_kevin = db.query(User).filter_by(name="Kevin").first()

if u_antony and db.query(Task).count() == 0:
    t1 = Task(
        title="Healthcare Dashboard UI",
        description="Design sprint review & presentation",
        owner_id=u_antony.id,
        deadline=datetime.utcnow() + timedelta(hours=3),
        status="IN_PROGRESS"
    )
    db.add(t1)

if u_kevin and db.query(Task).filter_by(owner_id=u_kevin.id).count() == 0:
    t2 = Task(
        title="Database Optimization & API Cache",
        description="Private task for Kevin: Optimize Postgres pool and Redis caching",
        owner_id=u_kevin.id,
        deadline=datetime.utcnow() + timedelta(days=2),
        status="PENDING_ACK"
    )
    db.add(t2)

db.commit()
print("Initialized DB successfully with Kevin and team members!")
