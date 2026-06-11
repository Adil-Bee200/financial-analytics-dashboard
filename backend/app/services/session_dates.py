from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

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
