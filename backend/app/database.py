from sqlalchemy import create_engine,event
from sqlalchemy.orm import sessionmaker,DeclarativeBase,Session
from sqlalchemy.pool import QueuePool
from app.config import settings

engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=not settings.is_production
)
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass

def get_db()->Session:
    """
    FastAPI dependency that yields a DB session and guarantees cleanup.
    Always use as: db: Session = Depends(get_db)
    """
    db=SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
