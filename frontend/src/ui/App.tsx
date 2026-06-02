import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiJson,
  DEFAULT_SYMBOLS,
  type AlertsResponse,
  type ForecastsResponse,
  type PricesResponse,
  type SummaryResponse,
} from "../api/client";
import type { TimeRange } from "../utils/chart";
import { ForecastPanel, pickProphetForecast } from "./components/ForecastPanel";
import { StockDetail } from "./components/StockDetail";
import { Watchlist } from "./components/Watchlist";

export function App() {
  const [symbol, setSymbol] = useState<string>("AAPL");
  const [range, setRange] = useState<TimeRange>("1M");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastsResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const refreshSummary = useCallback(async () => {
    setSummary(await apiJson<SummaryResponse>("/api/summary"));
  }, []);

  const refreshAlerts = useCallback(async () => {
    setAlerts(await apiJson<AlertsResponse>("/api/alerts"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadErr(null);
        await Promise.all([refreshSummary(), refreshAlerts()]);
      } catch (e) {
        if (!cancelled)
          setLoadErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSummary, refreshAlerts]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshSummary().catch(() => {});
      refreshAlerts().catch(() => {});
    }, 45_000);
    return () => window.clearInterval(id);
  }, [refreshSummary, refreshAlerts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const [p, f] = await Promise.all([
          apiJson<PricesResponse>(`/api/prices/${encodeURIComponent(symbol)}`),
          apiJson<ForecastsResponse>(
            `/api/forecasts/${encodeURIComponent(symbol)}`,
          ),
        ]);
        if (!cancelled) {
          setPrices(p);
          setForecasts(f);
        }
      } catch (e) {
        if (!cancelled)
          setLoadErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const tickers = useMemo(() => {
    if (summary?.tickers?.length) return summary.tickers;
    return DEFAULT_SYMBOLS.map((s) => ({ symbol: s }));
  }, [summary]);

  const summaryRow = summary?.tickers?.find((t) => t.symbol === symbol);
  const latestForecast = pickProphetForecast(forecasts?.forecasts);

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
          {loadErr && (
            <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>
              {loadErr}
            </div>
          )}
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
        {loadErr && (
          <div className="error-banner" role="alert" style={{ margin: "0 16px 12px" }}>
            {loadErr}
          </div>
        )}

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

