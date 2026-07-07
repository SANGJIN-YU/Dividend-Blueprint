from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.database.models import ETF
from app.schemas.etf import ETFRead

router = APIRouter(prefix="/etfs", tags=["ETF"])


@router.get("/", response_model=list[ETFRead])
def list_etfs(db: Session = Depends(get_db)) -> list[ETF]:
    return db.query(ETF).order_by(ETF.ticker).all()


@router.get("/{ticker}", response_model=ETFRead)
def get_etf(ticker: str, db: Session = Depends(get_db)) -> ETF:
    etf = db.query(ETF).filter(ETF.ticker == ticker.upper()).one_or_none()
    if etf is None:
        raise HTTPException(status_code=404, detail="ETF not found")
    return etf
