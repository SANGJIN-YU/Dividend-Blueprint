from typing import List

from pydantic import BaseModel, Field


class SimulationRequestSchema(BaseModel):
    ticker: str
    initial_investment: float = Field(gt=0)
    monthly_investment: float = Field(ge=0)
    period_years: int = Field(gt=0)


class YearlyProjectionSchema(BaseModel):
    year: int
    asset: float
    yearly_dividend: float


class SimulationResponseSchema(BaseModel):
    final_asset: float
    total_dividend: float
    yearly_projection: List[YearlyProjectionSchema]
