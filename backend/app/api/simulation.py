from fastapi import APIRouter

router = APIRouter(prefix="/simulations", tags=["Simulation"])


@router.get("/")
def list_simulations() -> dict[str, list]:
    """Placeholder endpoint for simulation resources."""
    return {"items": []}
