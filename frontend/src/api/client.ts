const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type SummaryTicker = {
  symbol: string;
  last_close: number | null;
  last_ts: string | null;
  change_pct: number | null;
  forecast_close: number | null;
};

export type SummaryResponse = { tickers: SummaryTicker[]; as_of: string };

export type AlertItem = {
  id: number;
  symbol: string;
  kind: string;
  severity: string;
  message: string;
  created_at: string;
};

export type AlertsResponse = { alerts: AlertItem[] };

export type PricePoint = {
  ts: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
};

export type PricesResponse = { symbol: string; points: PricePoint[] };

export type ForecastPoint = {
  created_at: string;
  forecast_for: string;
  horizon_label: string;
  predicted_close: number;
  model_version: string;
};

export type ForecastsResponse = { symbol: string; forecasts: ForecastPoint[] };

export async function apiJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const DEFAULT_SYMBOLS = [
  "AAPL",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "NVDA",
  "TSLA",
] as const;
