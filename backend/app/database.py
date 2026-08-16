from os import getenv
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV, override=False)

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
