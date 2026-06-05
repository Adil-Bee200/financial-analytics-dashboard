import { useEffect, useRef, useState } from "react";
import {
  fetchSymbolForecasts,
  fetchSymbolPrices,
  getErrorInfo,
  type ErrorInfo,
  type ForecastsResponse,
  type PricesResponse,
} from "../api/client";
import {
  getCachedForecasts,
  getStaleForecasts,
  setCachedForecasts,
  setCachedPrices,
} from "../api/symbolCache";
import { eodSessionDateKey } from "../utils/chart";

function lastPriceSession(
  data: PricesResponse | null | undefined,
): string | null {
  const ts = data?.points?.at(-1)?.ts;
  return ts ? eodSessionDateKey(ts) : null;
}

export function useSymbolData(
  symbol: string,
  summaryLastSession?: string | null,
) {
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const pricesRef = useRef<PricesResponse | null>(null);
  pricesRef.current = prices;

  useEffect(() => {
    let cancelled = false;

    const cachedForecasts =
      getCachedForecasts(symbol) ?? getStaleForecasts(symbol);

    setForecasts(cachedForecasts);
    setError(null);
    setLoading(true);
    setPrices(null);

    fetchSymbolPrices(symbol)
      .then((data) => {
        if (cancelled) return;
        setCachedPrices(symbol, data);
        setPrices(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(getErrorInfo(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (!getCachedForecasts(symbol)) {
      fetchSymbolForecasts(symbol)
        .then((data) => {
          if (cancelled) return;
          setCachedForecasts(symbol, data);
          setForecasts(data);
        })
        .catch((e) => {
          if (cancelled) return;
          setError((prev) => prev ?? getErrorInfo(e));
          setForecasts((current) => current ?? getStaleForecasts(symbol));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    if (!summaryLastSession) return;

    const currentSession = lastPriceSession(pricesRef.current);
    if (currentSession && currentSession >= summaryLastSession) return;

    let cancelled = false;

    fetchSymbolPrices(symbol)
      .then((data) => {
        if (cancelled) return;
        setCachedPrices(symbol, data);
        setPrices(data);
      })
      .catch(() => {
        /* keep the series already on screen */
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, summaryLastSession]);

  return { prices, forecasts, loading, error };
}
