"""Database models."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ETF(Base):
    """ETF master table."""

    __tablename__ = "etfs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticker: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(64), nullable=False, default="equity")
