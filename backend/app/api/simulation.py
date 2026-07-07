from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.database.models import ETF, Simulation
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.simulation_service import SimulationInput, SimulationService

router = APIRouter(prefix="/simulations", tags=["Simulation"])


@router.get("/")
def list_simulations() -> dict[str, list]:
    """Placeholder endpoint for simulation resources."""
    return {"items": []}


@router.post("/", response_model=SimulationResponse, status_code=201)
def create_simulation(payload: SimulationRequest, db: Session = Depends(get_db)) -> SimulationResponse:
    etf = db.get(ETF, payload.etf_id)
    if etf is None:
        raise HTTPException(status_code=404, detail="ETF not found")

    result = SimulationService.run(
        SimulationInput(
            initial_investment=payload.initial_investment,
            monthly_contribution=payload.monthly_contribution,
            investment_years=payload.investment_years,
            etf_dividend_yield=payload.expected_return,
            dividend_policy=payload.dividend_policy,
        )
    )

    simulation = Simulation(
        etf_id=payload.etf_id,
        initial_investment=payload.initial_investment,
        monthly_investment=payload.monthly_contribution,
        period_years=payload.investment_years,
        expected_return=payload.expected_return,
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return SimulationResponse(
        id=simulation.id,
        etf_id=simulation.etf_id,
        yearly_projection=result["yearly_projection"],
        final_asset=result["final_asset"],
        total_dividend=result["total_dividend"],
    )
