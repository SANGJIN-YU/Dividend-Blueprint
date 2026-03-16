from fastapi import APIRouter, HTTPException

from backend.app.schemas.etf import ETFDetailSchema, ETFListItemSchema
from backend.app.schemas.simulation import SimulationRequestSchema, SimulationResponseSchema
from backend.app.services.etf_service import get_etf_detail, get_etf_list
from backend.app.services.simulation_service import run_dividend_simulation

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/etf", response_model=list[ETFListItemSchema])
def list_etfs() -> list[ETFListItemSchema]:
    return get_etf_list()


@router.get("/etf/{ticker}", response_model=ETFDetailSchema)
def etf_detail(ticker: str) -> ETFDetailSchema:
    etf = get_etf_detail(ticker)
    if etf is None:
        raise HTTPException(status_code=404, detail=f"ETF '{ticker}' not found")
    return etf


@router.post("/simulation", response_model=SimulationResponseSchema)
def simulation(request: SimulationRequestSchema) -> SimulationResponseSchema:
    etf = get_etf_detail(request.ticker)
    if etf is None:
        raise HTTPException(status_code=404, detail=f"ETF '{request.ticker}' not found")

    return run_dividend_simulation(
        request=request,
        dividend_yield=etf.dividend_yield,
        expense_ratio=etf.expense_ratio,
    )
