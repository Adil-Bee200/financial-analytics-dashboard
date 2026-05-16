import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type SummaryTicker = {
  symbol: string;
  last_close: number | null;
  last_ts: string | null;
  change_pct: number | null;
  forecast_close: number | null;
};

type SummaryResponse = { tickers: SummaryTicker[]; as_of: string };

type AlertItem = {
  id: number;
  symbol: string;
  kind: string;
  severity: string;
  message: string;
  created_at: string;
};

type AlertsResponse = { alerts: AlertItem[] };

type PricePoint = {
  ts: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
};

type PricesResponse = { symbol: string; points: PricePoint[] };

type ForecastPoint = {
  created_at: string;
  horizon_label: string;
  predicted_close: number;
  model_version: string;
};

type ForecastsResponse = { symbol: string; forecasts: ForecastPoint[] };

async function apiJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function App() {
  const tickersDefault = useMemo(
    () => ["AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "TSLA"],
    [],
  );
  const [symbol, setSymbol] = useState("AAPL");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastsResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSummary = useCallback(async () => {
    const s = await apiJson<SummaryResponse>("/api/summary");
    setSummary(s);
  }, []);

  const refreshAlerts = useCallback(async () => {
    const a = await apiJson<AlertsResponse>("/api/alerts");
    setAlerts(a);
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

  const chartRows = useMemo(() => {
    const pts = prices?.points ?? [];
    return pts.map((r) => ({
      label: fmtTime(r.ts),
      close: r.close,
      ts: r.ts,
    }));
  }, [prices]);

  const latestForecast =
    forecasts?.forecasts && forecasts.forecasts.length > 0
      ? forecasts.forecasts[0]?.predicted_close
      : null;

  const summaryRow = summary?.tickers?.find((t) => t.symbol === symbol);

  const tiles = summary?.tickers?.length ? summary.tickers : tickersDefault.map((s) => ({ symbol: s }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,0.35), transparent), radial-gradient(1200px 600px at 80% 20%, rgba(16,185,129,0.20), transparent), #070A12",
        color: "#E6E9F2",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Stock Predictor</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, letterSpacing: -0.5 }}>
              Live prices & model forecasts
            </h1>
            <p style={{ margin: "10px 0 0", opacity: 0.72, maxWidth: 560 }}>
              Data ingested into PostgreSQL; Prophet forecasts refresh on a daily
              schedule (naive baseline for comparison). Switch tickers to inspect
              history and alerts.
            </p>
          </div>
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              fontSize: 12,
              color: "rgba(230,233,242,0.85)",
              maxWidth: 320,
            }}
          >
            API base:{" "}
            <code style={{ opacity: 0.95 }}>
              {API_BASE || "(same origin / Vite proxy)"}
            </code>
          </div>
        </header>

        {loadErr && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(248,113,113,0.08)",
              color: "#FECACA",
              fontSize: 13,
            }}
          >
            {loadErr}
          </div>
        )}

        <section style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
            Tickers
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tiles.map((t) => {
              const sym = "symbol" in t ? t.symbol : String(t);
              const active = sym === symbol;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setSymbol(sym)}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(167,139,250,0.9)"
                      : "1px solid rgba(255,255,255,0.14)",
                    background: active
                      ? "rgba(124,58,237,0.35)"
                      : "rgba(255,255,255,0.04)",
                    color: "#E6E9F2",
                    fontSize: 13,
                  }}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Close history</div>
                <div style={{ fontSize: 22, marginTop: 4 }}>{symbol}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Latest</div>
                <div style={{ fontSize: 22, marginTop: 4 }}>
                  {summaryRow?.last_close != null
                    ? `$${summaryRow.last_close.toFixed(2)}`
                    : loading
                      ? "…"
                      : "—"}
                </div>
                {summaryRow?.change_pct != null && (
                  <div
                    style={{
                      fontSize: 13,
                      marginTop: 4,
                      color:
                        summaryRow.change_pct >= 0 ? "#6EE7B7" : "#FCA5A5",
                    }}
                  >
                    {summaryRow.change_pct >= 0 ? "+" : ""}
                    {summaryRow.change_pct.toFixed(2)}% vs prior snapshot
                  </div>
                )}
              </div>
            </div>
            <div style={{ height: 360, marginTop: 12 }}>
              {chartRows.length === 0 && !loading ? (
                <div style={{ opacity: 0.65, padding: 16 }}>
                  No price rows yet. Start ingestion worker / Docker Compose and wait
                  for the first snapshot.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows}>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(230,233,242,0.45)", fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "rgba(230,233,242,0.55)" }}
                      domain={["auto", "auto"]}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(7,10,18,0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#E6E9F2",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#A78BFA"
                      strokeWidth={2}
                      dot={false}
                      name="Close"
                    />
                    {latestForecast != null && (
                      <ReferenceLine
                        y={latestForecast}
                        stroke="#34D399"
                        strokeDasharray="6 6"
                        label={{
                          value: `Forecast $${latestForecast.toFixed(2)}`,
                          fill: "rgba(52,211,153,0.95)",
                          fontSize: 11,
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Latest forecast</div>
              <div style={{ fontSize: 20, marginTop: 6 }}>
                {latestForecast != null
                  ? `$${latestForecast.toFixed(2)}`
                  : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                {forecasts?.forecasts?.[0]?.model_version ?? "prophet"}
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Active alerts</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {(alerts?.alerts?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.65 }}>No open alerts.</div>
                ) : (
                  alerts!.alerts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: 10,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ opacity: 0.75 }}>{a.symbol}</div>
                      <div>{a.message}</div>
                      <div style={{ opacity: 0.55, marginTop: 4 }}>
                        {fmtTime(a.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <footer style={{ marginTop: 28, fontSize: 12, opacity: 0.5 }}>
          Summary as of{" "}
          {summary?.as_of ? fmtTime(summary.as_of) : "—"} · OpenAPI at{" "}
          <code>/docs</code>
        </footer>
      </div>
    </div>
  );
}
