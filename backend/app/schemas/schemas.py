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



# PricePoint

class PricePointBase(BaseModel):
    ticker_id: int
    ts: datetime
    open_price: float | None = None
    high_price: float | None = None
    low_price: float | None = None
    close_price: float | None = None
    volume: int | None = None
    source: str | None = Field(default=None, max_length=100)


class PricePointCreate(PricePointBase):
    pass


class PricePointRead(PricePointBase):
    model_config = ConfigDict(from_attributes=True)

    id: int



# Forecast

class ForecastBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    ticker_id: int
    forecast_for: datetime
    predicted_price: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    model_name: str | None = Field(default=None, max_length=100)


class ForecastCreate(ForecastBase):
    pass


class ForecastRead(ForecastBase):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    generated_at: datetime



