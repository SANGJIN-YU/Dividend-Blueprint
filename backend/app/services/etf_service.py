from __future__ import annotations

from typing import List, Optional

from backend.app.db import get_connection
from backend.app.schemas.etf import ETFDetailSchema, ETFListItemSchema


def get_etf_list() -> List[ETFListItemSchema]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT ticker, name, price, dividend_yield FROM etfs ORDER BY ticker"
        ).fetchall()
    return [ETFListItemSchema(**dict(row)) for row in rows]


def get_etf_detail(ticker: str) -> Optional[ETFDetailSchema]:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT ticker, name, price, dividend_yield, dividend_frequency, expense_ratio
            FROM etfs
            WHERE ticker = ?
            """,
            (ticker.upper(),),
        ).fetchone()
    if row is None:
        return None
    return ETFDetailSchema(**dict(row))
