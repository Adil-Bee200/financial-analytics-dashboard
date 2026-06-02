import type { ForecastPoint } from "../../api/client";
import { fmtDate, fmtForecastFor, fmtPrice } from "../../utils/format";

const PROPHET_MODEL = "prophet_v1";

type Props = {
  forecast: ForecastPoint | null | undefined;
  fallbackPrice?: number | null;
  compact?: boolean;
};

export function pickProphetForecast(
  forecasts: ForecastPoint[] | undefined,
): ForecastPoint | undefined {
  if (!forecasts?.length) return undefined;
  return (
    forecasts.find((f) => f.model_version === PROPHET_MODEL) ?? forecasts[0]
  );
}

export function ForecastPanel({ forecast, fallbackPrice, compact }: Props) {
  const price = forecast?.predicted_close ?? fallbackPrice ?? null;
  const modelLabel =
    forecast?.model_version === PROPHET_MODEL
      ? "Prophet forecast"
      : forecast?.model_version ?? "Forecast";

  const targetLabel = forecast?.forecast_for
    ? `For ${fmtForecastFor(forecast.forecast_for)}`
    : forecast?.horizon_label
      ? `${forecast.horizon_label} ahead`
      : "Next session";

  return (
    <div className={`forecast-box${compact ? " forecast-box--compact" : ""}`}>
      <span className="label">{modelLabel}</span>
      <span className="forecast-date">{targetLabel}</span>
      <span className="value">{fmtPrice(price)}</span>
      <span className="meta">
        {forecast
          ? `Updated ${fmtDate(forecast.created_at)} · ${forecast.horizon_label} ahead`
          : "No forecast yet"}
      </span>
    </div>
  );
}
