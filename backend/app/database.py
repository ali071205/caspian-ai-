from os import getenv
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV, override=True)

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATABASE_URL = getenv("DATABASE_URL", "")
if not DATABASE_URL or DATABASE_URL.startswith("sqlite:///./teamops.db"):
    DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'teamops.db'}"
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif not (DATABASE_URL.startswith("sqlite") or DATABASE_URL.startswith("postgresql")):
    DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'teamops.db'}"

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine_kwargs = {"connect_args": connect_args}
if "postgresql" in DATABASE_URL:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

