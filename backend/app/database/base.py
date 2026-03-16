"""Database initialization utilities."""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    """Base class for all ORM models."""


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dividend_blueprint.db")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Create database tables from SQLAlchemy metadata."""
    from app.database import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
