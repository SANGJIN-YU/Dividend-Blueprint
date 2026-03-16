from __future__ import annotations

from backend.app.schemas.simulation import (
    SimulationRequestSchema,
    SimulationResponseSchema,
    YearlyProjectionSchema,
)


def run_dividend_simulation(
    request: SimulationRequestSchema,
    dividend_yield: float,
    expense_ratio: float,
) -> SimulationResponseSchema:
    annual_yield_net = max(dividend_yield - expense_ratio, 0)

    asset = request.initial_investment
    total_dividend = 0.0
    projection: list[YearlyProjectionSchema] = []

    for year in range(1, request.period_years + 1):
        asset += request.monthly_investment * 12
        yearly_dividend = asset * annual_yield_net
        asset += yearly_dividend
        total_dividend += yearly_dividend

        projection.append(
            YearlyProjectionSchema(
                year=year,
                asset=round(asset, 2),
                yearly_dividend=round(yearly_dividend, 2),
            )
        )

    return SimulationResponseSchema(
        final_asset=round(asset, 2),
        total_dividend=round(total_dividend, 2),
        yearly_projection=projection,
    )
