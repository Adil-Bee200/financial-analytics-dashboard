from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pandas as pd
from pandas.tseries.offsets import BDay

ET = ZoneInfo("America/New_York")


def _normalize_ts(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def eod_session_key(ts: datetime) -> str:
    """Trading session date for a daily bar (matches frontend ``eodSessionDateKey``)."""
    normalized = _normalize_ts(ts)
    et = normalized.astimezone(ET).strftime("%Y-%m-%d")
    utc = normalized.strftime("%Y-%m-%d")
    return et if et >= utc else utc


def session_midnight_utc(session_key: str) -> datetime:
    """UTC instant for 00:00 Eastern on ``session_key`` (``YYYY-MM-DD``)."""
    year, month, day = (int(part) for part in session_key.split("-"))
    return datetime(year, month, day, tzinfo=ET).astimezone(timezone.utc)


def next_trading_session_key(session_key: str) -> str:
    """Next Mon–Fri session after ``session_key`` (US equity weekday calendar)."""
    return (pd.Timestamp(session_key) + BDay(1)).strftime("%Y-%m-%d")


def is_settled_eod_session(session_key: str, now: datetime | None = None) -> bool:
    """False for future sessions and for today before the 4:00pm ET cash close."""
    now = _normalize_ts(now or datetime.now(timezone.utc))
    now_et = now.astimezone(ET)
    today_key = now_et.strftime("%Y-%m-%d")
    if session_key < today_key:
        return True
    if session_key > today_key:
        return False
    close_et = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return now_et >= close_et
