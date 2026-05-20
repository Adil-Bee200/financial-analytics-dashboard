import type { SummaryTicker } from "../../api/client";
import { getStockMeta } from "../../data/stockMeta";
import { fmtChange, fmtPrice } from "../../utils/format";

type Props = {
  tickers: SummaryTicker[];
  active: string;
  onSelect: (symbol: string) => void;
};

export function Watchlist({ tickers, active, onSelect }: Props) {
  return (
    <>
      <h2>Watchlist</h2>
      <p>7 symbols · EOD data</p>
      {tickers.map((t) => {
        const meta = getStockMeta(t.symbol);
        const positive = (t.change_pct ?? 0) >= 0;
        return (
          <button
            key={t.symbol}
            type="button"
            className={`watchlist-item${t.symbol === active ? " active" : ""}`}
            onClick={() => onSelect(t.symbol)}
          >
            <span
              className="stock-logo"
              style={{
                width: 32,
                height: 32,
                fontSize: 12,
                background: meta.logoColor,
              }}
            >
              {meta.logoLetter}
            </span>
            <span>
              <span className="sym">{t.symbol}</span>
              <br />
              <span style={{ fontSize: 11, color: "#71717a" }}>
                {meta.name.split(" ")[0]}
              </span>
            </span>
            <span className="price-col">
              <span className="price">{fmtPrice(t.last_close)}</span>
              <br />
              <span className={`chg ${positive ? "positive" : "negative"}`}>
                {fmtChange(t.change_pct)}
              </span>
            </span>
          </button>
        );
      })}
    </>
  );
}


