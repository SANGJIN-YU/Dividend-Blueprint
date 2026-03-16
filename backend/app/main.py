from fastapi import FastAPI

from app.api.etf import router as etf_router
from app.api.simulation import router as simulation_router

app = FastAPI(title="Dividend Blueprint API")


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Simple endpoint used to verify server is running."""
    return {"status": "ok"}


app.include_router(etf_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
