"""Seed default ETFs with ticker-based upsert policy."""

from __future__ import annotations

from app.database.base import SessionLocal, init_db
from app.database.models import ETF

DEFAULT_ETFS = [
    {"ticker": "SCHD", "name": "Schwab U.S. Dividend Equity ETF", "asset_class": "equity"},
    {"ticker": "VOO", "name": "Vanguard S&P 500 ETF", "asset_class": "equity"},
    {"ticker": "VYM", "name": "Vanguard High Dividend Yield ETF", "asset_class": "equity"},
    {"ticker": "JEPI", "name": "JPMorgan Equity Premium Income ETF", "asset_class": "equity"},
]


def upsert_default_etfs() -> None:
    """Insert or update default ETF rows by ticker."""
    init_db()

    with SessionLocal() as session:
        for payload in DEFAULT_ETFS:
            existing = session.query(ETF).filter(ETF.ticker == payload["ticker"]).one_or_none()
            if existing:
                existing.name = payload["name"]
                existing.asset_class = payload["asset_class"]
            else:
                session.add(ETF(**payload))
        session.commit()


if __name__ == "__main__":
    upsert_default_etfs()
    print("Default ETF seed completed.")
