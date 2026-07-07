"""Pydantic schemas for dividend simulation requests/responses."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.simulation_service import DividendPolicy


class SimulationRequest(BaseModel):
    etf_id: int
    initial_investment: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    investment_years: int = Field(gt=0)
    expected_return: float = Field(gt=0, description="연 배당률 (예: 0.03 = 3%)")
    dividend_policy: DividendPolicy = "growing"


class YearlyProjection(BaseModel):
    year: int
    asset: float
    dividend: float


class SimulationResponse(BaseModel):
    id: int
    etf_id: int
    yearly_projection: list[YearlyProjection]
    final_asset: float
    total_dividend: float
