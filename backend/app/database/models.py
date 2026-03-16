"""Database models."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ETF(Base):
    """ETF master table."""

    __tablename__ = "etfs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticker: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    asset_class: Mapped[str] = mapped_column(String(64), nullable=False, default="equity")

    dividend_histories: Mapped[list["DividendHistory"]] = relationship(
        back_populates="etf", cascade="all, delete-orphan"
    )
    simulations: Mapped[list["Simulation"]] = relationship(
        back_populates="etf", cascade="all, delete-orphan"
    )


class DividendHistory(Base):
    """ETF dividend history."""

    __tablename__ = "dividend_histories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    etf_id: Mapped[int] = mapped_column(ForeignKey("etfs.id"), nullable=False, index=True)
    ex_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    dividend: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    etf: Mapped[ETF] = relationship(back_populates="dividend_histories")


class Simulation(Base):
    """Simulation execution history."""

    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    etf_id: Mapped[int] = mapped_column(ForeignKey("etfs.id"), nullable=False, index=True)
    initial_investment: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    monthly_investment: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    period_years: Mapped[int] = mapped_column(nullable=False)
    expected_return: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    etf: Mapped[ETF] = relationship(back_populates="simulations")
