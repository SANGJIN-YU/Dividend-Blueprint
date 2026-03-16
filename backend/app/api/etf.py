from fastapi import APIRouter

router = APIRouter(prefix="/etfs", tags=["ETF"])


@router.get("/")
def list_etfs() -> dict[str, list]:
    """Placeholder endpoint for ETF resources."""
    return {"items": []}
