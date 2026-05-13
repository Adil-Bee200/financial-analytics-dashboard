from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# Ticker

class TickerBase(BaseModel):
    symbol: str = Field(..., max_length=16)
    name: str | None = None
    asset_type: str | None = None
    exchange: str | None = None


class TickerCreate(TickerBase):
    pass


class TickerRead(TickerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime



