from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Numeric, String
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

Base = declarative_base()


class UUIDPrimaryKeyMixin:
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )


class ETF(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "etfs"
    __table_args__ = (Index("ix_etfs_ticker", "ticker"),)

    ticker: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    dividend_yield: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    dividend_frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    expense_ratio: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    dividend_histories: Mapped[list["DividendHistory"]] = relationship(
        "DividendHistory",
        back_populates="etf",
        cascade="all, delete-orphan",
    )
    simulations: Mapped[list["Simulation"]] = relationship(
        "Simulation",
        back_populates="etf",
        cascade="all, delete-orphan",
    )
