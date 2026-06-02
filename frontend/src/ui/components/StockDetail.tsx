import type { AlertsResponse, ForecastsResponse, PricesResponse, SummaryTicker } from "../../api/client";
import { buildNewsItems } from "../../data/news";
import type { TimeRange } from "../../utils/chart";
import { filterByRange } from "../../utils/chart";
import { fmtChartTime } from "../../utils/format";
import { ForecastPanel, pickProphetForecast } from "./ForecastPanel";
import { NewsSection } from "./NewsSection";
import { StockChart } from "./StockChart";
import { StockHeader } from "./StockHeader";
import { TimeRangePicker } from "./TimeRangePicker";
import { TradeActions } from "./TradeActions";

type Props = {
  symbol: string;
  summaryRow: SummaryTicker | undefined;
  prices: PricesResponse | null;
  forecasts: ForecastsResponse | null;
  alerts: AlertsResponse | null;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  loading: boolean;
  showBack?: boolean;
  onBack?: () => void;
  showMobileFabs?: boolean;
};

export function StockDetail({
  symbol,
  summaryRow,
  prices,
  forecasts,
  alerts,
  range,
  onRangeChange,
  loading,
  showBack,
  onBack,
  showMobileFabs = true,
}: Props) {
  const filtered = filterByRange(prices?.points ?? [], range);
  const chartData = filtered.map((p) => ({
    ts: p.ts,
    close: p.close,
    volume: p.volume,
    label: fmtChartTime(p.ts, range),
  }));

  const prophetForecast = pickProphetForecast(forecasts?.forecasts);
  const latestForecast = prophetForecast?.predicted_close ?? null;
  const news = buildNewsItems(symbol, alerts?.alerts ?? []);

  return (
    <>
      <StockHeader
        symbol={symbol}
        price={summaryRow?.last_close ?? null}
        changePct={summaryRow?.change_pct ?? null}
        showBack={showBack}
        onBack={onBack}
      />

      <StockChart
        data={chartData}
        range={range}
        loading={loading}
        forecastPrice={latestForecast}
      />

      <TimeRangePicker value={range} onChange={onRangeChange} />

      <div className="mobile-only" style={{ marginBottom: 16 }}>
        <ForecastPanel
          forecast={prophetForecast}
          fallbackPrice={summaryRow?.forecast_close}
          compact
        />
      </div>

      <NewsSection items={news} />

      {showMobileFabs && (
        <TradeActions onClose={onBack} />
      )}
    </>
  );
}


