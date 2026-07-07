"""Pydantic schemas for ETF resources."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ETFRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    name: str
    asset_class: str
