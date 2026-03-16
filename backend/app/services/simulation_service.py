"""Dividend simulation service.

이 모듈은 초기 투자금/월 적립금/기간/배당률을 입력으로 받아
연 단위 자산 및 배당금 추이를 계산합니다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict


DividendPolicy = Literal["fixed", "growing"]


class YearlyProjection(TypedDict):
    year: int
    asset: float
    dividend: float


class SimulationResult(TypedDict):
    yearly_projection: list[YearlyProjection]
    final_asset: float
    total_dividend: float


@dataclass(frozen=True)
class SimulationInput:
    initial_investment: float
    monthly_contribution: float
    investment_years: int
    etf_dividend_yield: float
    dividend_policy: DividendPolicy = "growing"


def simulate_dividend_growth(payload: SimulationInput) -> SimulationResult:
    """Run a yearly dividend reinvestment simulation.

    Rules:
      1) 매년 초 자산에 (월 적립금 * 12) 반영
      2) 이후 7% 자산 성장(asset * 1.07)
      3) 현재 배당률로 배당금 계산(asset * current_dividend_yield)
      4) 계산된 배당금을 자산에 재투자
      5) 배당 정책이 growing 이면 배당률을 매년 5% 증가(yield *= 1.05)
    """

    asset = float(payload.initial_investment)
    yearly_contribution = float(payload.monthly_contribution) * 12
    current_dividend_yield = float(payload.etf_dividend_yield)
    total_dividend = 0.0
    yearly_projection: list[YearlyProjection] = []

    for year in range(1, payload.investment_years + 1):
        asset += yearly_contribution
        asset *= 1.07

        dividend = asset * current_dividend_yield
        asset += dividend

        total_dividend += dividend
        yearly_projection.append(
            {
                "year": year,
                "asset": asset,
                "dividend": dividend,
            }
        )

        if payload.dividend_policy == "growing":
            current_dividend_yield *= 1.05

    return {
        "yearly_projection": yearly_projection,
        "final_asset": asset,
        "total_dividend": total_dividend,
    }


class SimulationService:
    """Service wrapper for simulation logic."""

    @staticmethod
    def run(payload: SimulationInput) -> SimulationResult:
        return simulate_dividend_growth(payload)
