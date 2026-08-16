from os import getenv
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import MetaData, create_engine, select, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ROOT_ENV, override=True)
load_dotenv(BACKEND_ENV, override=True)

BACKEND_DIR = Path(__file__).resolve().parents[1]
raw_db_url = getenv("DATABASE_URL", "")

if not raw_db_url:
    db_file = (BACKEND_DIR / "teamops.db").resolve().as_posix()
    DATABASE_URL = f"sqlite:///{db_file}"
elif raw_db_url.startswith("sqlite:///./"):
    relative_db = raw_db_url.removeprefix("sqlite:///./")
    db_file = (BACKEND_DIR / relative_db).resolve().as_posix()
    DATABASE_URL = f"sqlite:///{db_file}"
elif raw_db_url.startswith("sqlite:///"):
    DATABASE_URL = raw_db_url
elif raw_db_url.startswith("postgresql://"):
    DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = raw_db_url

is_postgres = "postgresql" in DATABASE_URL
if is_postgres:
    try:
        test_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 4})
        with test_engine.connect() as test_conn:
            pass
        test_engine.dispose()
    except Exception as e:
        print(f"⚠️ [Database Warning] PostgreSQL connection failed ({e}). Falling back to SQLite.")
        db_file = (BACKEND_DIR / "teamops.db").resolve().as_posix()
        DATABASE_URL = f"sqlite:///{db_file}"
        is_postgres = False

meta = MetaData()

connect_args = {"check_same_thread": False} if not is_postgres else {}
engine_kwargs = {"connect_args": connect_args}
if is_postgres:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    metadata = meta


def init_db():
    global _db_initialized
    # Ensure all ORM models are registered in Base.metadata before creating tables
    from . import models
    from .models import User, TeamWorkspace, TeamMember

    if is_postgres:
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS caspian;"))
                conn.commit()
        except Exception:
            pass
    else:
        for table in Base.metadata.tables.values():
            table.schema = None
            
    Base.metadata.create_all(engine)
    
    # Auto-seed default workspace if empty
    with SessionLocal() as db:
        try:
            ws = db.scalar(select(TeamWorkspace).where(TeamWorkspace.team_code == "CASPIAN-2026"))
            if not ws:
                admin_user = db.scalar(select(User).where(User.name == "Admin"))
                if not admin_user:
                    admin_user = User(name="Admin", email="admin@caspian.ai")
                    db.add(admin_user)
                    db.flush()
                ws = TeamWorkspace(name="Caspian Sentinel Team", team_code="CASPIAN-2026", admin_id=admin_user.id)
                db.add(ws)
                db.flush()
                member = db.scalar(select(TeamMember).where(TeamMember.user_id == admin_user.id))
                if not member:
                    member = TeamMember(user_id=admin_user.id, role="Admin / Workspace Owner", approved=True, active=True, team_id=ws.id)
                    db.add(member)
                db.commit()
        except Exception as err:
            db.rollback()
            print("Auto-seed error:", err)
    _db_initialized = True


_db_initialized = False


def get_db():
    global _db_initialized
    if not _db_initialized:
        try:
            init_db()
        except Exception as err:
            print("DB init error:", err)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

