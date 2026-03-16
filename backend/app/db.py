from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "dividend_blueprint.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS etfs (
                ticker TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                dividend_yield REAL NOT NULL,
                dividend_frequency TEXT NOT NULL,
                expense_ratio REAL NOT NULL
            )
            """
        )
        count_row = conn.execute("SELECT COUNT(*) AS count FROM etfs").fetchone()
        if count_row["count"] == 0:
            conn.executemany(
                """
                INSERT INTO etfs (ticker, name, price, dividend_yield, dividend_frequency, expense_ratio)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("SCHD", "Schwab U.S. Dividend Equity ETF", 78.12, 0.034, "quarterly", 0.0006),
                    ("JEPI", "JPMorgan Equity Premium Income ETF", 56.45, 0.072, "monthly", 0.0035),
                    ("VYM", "Vanguard High Dividend Yield ETF", 119.08, 0.029, "quarterly", 0.0006),
                ],
            )
        conn.commit()
