import ssl
import urllib.parse
import uuid
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import settings


def _get_engine_url_and_args(raw_url: str):
    url = raw_url
    if url.startswith("postgresql://"):
        url = "postgresql+pg8000://" + url[len("postgresql://"):]

    parsed = urllib.parse.urlsplit(url)
    qs = urllib.parse.parse_qs(parsed.query)

    use_ssl = (
        "sslmode" in qs
        or "ssl" in qs
        or "neon.tech" in parsed.netloc
        or "supabase.co" in parsed.netloc
        or "render.com" in parsed.netloc
    )

    # Strip parameters that pg8000 rejects
    clean_qs = {k: v for k, v in qs.items() if k not in ("sslmode", "ssl")}
    flat_qs = [(k, v[0]) for k, v in clean_qs.items()]
    new_query = urllib.parse.urlencode(flat_qs)
    clean_url = urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment)
    )

    connect_args = {}
    if "pg8000" in parsed.scheme and use_ssl:
        connect_args["ssl_context"] = ssl.create_default_context()

    return clean_url, connect_args


_clean_db_url, _connect_args = _get_engine_url_and_args(settings.database_url)

engine = create_engine(
    _clean_db_url,
    connect_args=_connect_args,
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
