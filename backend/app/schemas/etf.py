from pydantic import BaseModel


class ETFListItemSchema(BaseModel):
    ticker: str
    name: str
    price: float
    dividend_yield: float


class ETFDetailSchema(ETFListItemSchema):
    dividend_frequency: str
    expense_ratio: float
