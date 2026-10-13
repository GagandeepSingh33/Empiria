import uuid
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def set_tenant_context(db: Session, tenant_id: str | uuid.UUID | None) -> None:
    """Sets a transaction-local tenant context in PostgreSQL for RLS and auditing."""
    if tenant_id:
        db.execute(
            text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
            {"tenant_id": str(tenant_id)},
        )
    else:
        db.execute(text("SELECT set_config('app.tenant_id', '', true)"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
