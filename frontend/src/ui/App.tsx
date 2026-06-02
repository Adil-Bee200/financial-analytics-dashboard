import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiJson,
  DEFAULT_SYMBOLS,
  getErrorInfo,
  type AlertsResponse,
  type ErrorInfo,
  type SummaryResponse,
} from "../api/client";
import { useSymbolData } from "../hooks/useSymbolData";
import {
  buildWatchlistTickers,
  getCachedSummary,
  getStaleSummary,
  setCachedSummary,
} from "../api/symbolCache";
import type { TimeRange } from "../utils/chart";
import { ErrorBanner } from "./components/ErrorBanner";
import { ForecastPanel, pickProphetForecast } from "./components/ForecastPanel";
import { StockDetail } from "./components/StockDetail";
import { Watchlist } from "./components/Watchlist";

export function App() {
  const [symbol, setSymbol] = useState<string>("AAPL");
  const [range, setRange] = useState<TimeRange>("1M");
  const [summary, setSummary] = useState<SummaryResponse | null>(
    () => getCachedSummary() ?? getStaleSummary(),
  );
  const lastGoodSummary = useRef<SummaryResponse | null>(
    getCachedSummary() ?? getStaleSummary(),
  );
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loadErr, setLoadErr] = useState<ErrorInfo | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const applySummary = useCallback((data: SummaryResponse) => {
    lastGoodSummary.current = data;
    setCachedSummary(data);
    setSummary(data);
  }, []);

  const {
    prices,
    forecasts,
    loading,
    error: symbolErr,
  } = useSymbolData(symbol);

  const refreshSummary = useCallback(async () => {
    const data = await apiJson<SummaryResponse>("/api/summary");
    applySummary(data);
  }, [applySummary]);

  const refreshAlerts = useCallback(async () => {
    setAlerts(await apiJson<AlertsResponse>("/api/alerts"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadErr(null);
      const errors: ErrorInfo[] = [];

      try {
        const data = await apiJson<SummaryResponse>("/api/summary");
        if (!cancelled) applySummary(data);
      } catch (e) {
        errors.push(getErrorInfo(e));
        if (!cancelled && lastGoodSummary.current) {
          setSummary(lastGoodSummary.current);
        }
      }

      try {
        const data = await apiJson<AlertsResponse>("/api/alerts");
        if (!cancelled) setAlerts(data);
      } catch (e) {
        errors.push(getErrorInfo(e));
      }

      if (!cancelled && errors.length > 0) {
        setLoadErr(errors.find((err) => err.rateLimited) ?? errors[0]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshSummary().catch(() => {});
      refreshAlerts().catch(() => {});
    }, 45_000);
    return () => window.clearInterval(id);
  }, [refreshSummary, refreshAlerts]);

  const tickers = useMemo(
    () =>
      buildWatchlistTickers(
        summary ?? lastGoodSummary.current,
        DEFAULT_SYMBOLS,
      ),
    [summary, symbol, prices],
  );

  const summaryRow = tickers.find((t) => t.symbol === symbol);
  const latestForecast = pickProphetForecast(forecasts?.forecasts);
  const displayError = loadErr ?? symbolErr;

  const selectSymbol = (sym: string) => {
    setSymbol(sym);
    setMobileListOpen(false);
  };

  return (
    <div className="app">
      <div className="dashboard">
        <aside className="watchlist-panel">
          <Watchlist
            tickers={tickers}
            active={symbol}
            onSelect={selectSymbol}
          />
        </aside>

        <main className="main-panel">
          <ErrorBanner error={displayError} style={{ marginBottom: 16 }} />
          <StockDetail
            symbol={symbol}
            summaryRow={summaryRow}
            prices={prices}
            forecasts={forecasts}
            alerts={alerts}
            range={range}
            onRangeChange={setRange}
            loading={loading}
            showMobileFabs={false}
          />
        </main>

        <aside className="trade-panel">
          <h3>Forecast</h3>
          <ForecastPanel
            forecast={latestForecast}
            fallbackPrice={summaryRow?.forecast_close}
          />
        </aside>
      </div>

      <div className="mobile-shell mobile-only">
        <ErrorBanner error={displayError} style={{ margin: "0 16px 12px" }} />

        {mobileListOpen ? (
          <div className="phone-frame">
            <div className="phone-notch">
              <span />
            </div>
            <div className="phone-content" style={{ paddingTop: 8 }}>
              <div className="nav-row" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Back"
                  onClick={() => setMobileListOpen(false)}
                >
                  ←
                </button>
                <h2 style={{ margin: 0, fontSize: 16, flex: 1, textAlign: "center" }}>
                  Watchlist
                </h2>
                <span style={{ width: 36 }} />
              </div>
              <Watchlist
                tickers={tickers}
                active={symbol}
                onSelect={selectSymbol}
              />
            </div>
          </div>
        ) : (
          <div className="phone-frame">
            <div className="phone-notch">
              <span />
            </div>
            <div className="phone-content">
              <div className="mobile-picker">
                {tickers.map((t) => (
                  <button
                    key={t.symbol}
                    type="button"
                    className={t.symbol === symbol ? "active" : undefined}
                    onClick={() => selectSymbol(t.symbol)}
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
              <StockDetail
                symbol={symbol}
                summaryRow={summaryRow}
                prices={prices}
                forecasts={forecasts}
                alerts={alerts}
                range={range}
                onRangeChange={setRange}
                loading={loading}
                showBack
                onBack={() => setMobileListOpen(true)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

