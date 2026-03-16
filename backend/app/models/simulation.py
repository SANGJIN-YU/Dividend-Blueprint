from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.etf import Base, UUIDPrimaryKeyMixin


class Simulation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "simulations"
    __table_args__ = (Index("ix_simulations_etf_id", "etf_id"),)

    etf_id: Mapped[str] = mapped_column(String(36), ForeignKey("etfs.id"), nullable=False)
    initial_investment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    monthly_investment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period_years: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_return: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    etf: Mapped["ETF"] = relationship("ETF", back_populates="simulations")
