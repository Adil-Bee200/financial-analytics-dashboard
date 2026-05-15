from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Ticker
from app.services.forecast_train import TrainSymbolResult, train_symbol
from app.services.price_ingest import IngestSymbolResult, ingest_all

log = logging.getLogger(__name__)


@dataclass
class IngestJobReport:
    results: list[IngestSymbolResult] = field(default_factory=list)

    @property
    def succeeded(self) -> int:
        return sum(1 for r in self.results if r.error is None)

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.error is not None)


@dataclass
class TrainJobReport:
    results: list[TrainSymbolResult] = field(default_factory=list)

    @property
    def succeeded(self) -> int:
        return sum(
            1 for r in self.results if r.prophet_written and r.baseline_written
        )

    @property
    def failed(self) -> int:
        return len(self.results) - self.succeeded


@dataclass
class DailyPipelineReport:
    ingest: IngestJobReport
    train: TrainJobReport


def _resolve_symbols(session: Session, symbols: list[str] | None) -> list[str]:
    syms = symbols or settings.get_worker_symbols()
    return [s.upper() for s in syms]


def run_eod_ingest(
    session: Session,
    symbols: list[str] | None = None,
    *,
    period: str | None = None,
    fetch_info: bool | None = None,
) -> IngestJobReport:
    """Download Yahoo daily bars and upsert into ``price_points``."""
    syms = _resolve_symbols(session, symbols)
    log.info("EOD ingest starting for %s", ", ".join(syms))
    results = ingest_all(
        session,
        syms,
        period=period or settings.worker_ingest_period,
        fetch_info=(
            settings.worker_fetch_ticker_info
            if fetch_info is None
            else fetch_info
        ),
    )
    report = IngestJobReport(results=results)
    log.info("EOD ingest done: %d ok, %d failed", report.succeeded, report.failed)
    for r in results:
        if r.error:
            log.error("%s: %s", r.symbol, r.error)
        else:
            log.info("%s: upserted %d rows", r.symbol, r.rows)
    return report


def run_training(
    session: Session,
    symbols: list[str] | None = None,
) -> TrainJobReport:
    """Train Prophet + naive baseline and write ``forecasts`` rows."""
    syms = _resolve_symbols(session, symbols)
    log.info("Training starting for %s", ", ".join(syms))

    results: list[TrainSymbolResult] = []
    for sym in syms:
        ticker = session.scalars(
            select(Ticker).where(Ticker.symbol == sym)
        ).first()
        if ticker is None:
            results.append(
                TrainSymbolResult(
                    symbol=sym,
                    prophet_written=False,
                    baseline_written=False,
                    error="ticker not found (run ingest first)",
                )
            )
            continue

        try:
            outcome = train_symbol(
                session,
                ticker,
                min_rows=settings.worker_train_min_rows,
            )
            if outcome.error:
                session.rollback()
                log.error("%s: %s", sym, outcome.error)
            else:
                session.commit()
                log.info("%s: forecasts written", sym)
            results.append(outcome)
        except Exception as exc:  # noqa: BLE001
            session.rollback()
            log.exception("training failed for %s", sym)
            results.append(
                TrainSymbolResult(
                    symbol=sym,
                    prophet_written=False,
                    baseline_written=False,
                    error=str(exc),
                )
            )

    report = TrainJobReport(results=results)
    log.info("Training done: %d ok, %d failed", report.succeeded, report.failed)
    return report


def run_daily_pipeline(
    session: Session,
    symbols: list[str] | None = None,
) -> DailyPipelineReport:
    """End-of-day job: ingest latest EOD bars, then retrain all models."""
    ingest = run_eod_ingest(session, symbols=symbols)
    train = run_training(session, symbols=symbols)
    return DailyPipelineReport(ingest=ingest, train=train)
