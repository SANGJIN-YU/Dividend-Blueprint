from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.etf import Base, UUIDPrimaryKeyMixin


class DividendHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "dividend_histories"
    __table_args__ = (
        Index("ix_dividend_histories_etf_id", "etf_id"),
        Index("ix_dividend_histories_ex_date", "ex_date"),
    )

    etf_id: Mapped[str] = mapped_column(String(36), ForeignKey("etfs.id"), nullable=False)
    ex_date: Mapped[date] = mapped_column(Date, nullable=False)
    dividend: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    etf: Mapped["ETF"] = relationship("ETF", back_populates="dividend_histories")
