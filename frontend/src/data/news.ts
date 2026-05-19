import type { AlertItem } from "../api/client";
import { fmtDate } from "../utils/format";

export type NewsItem = {
  id: string;
  date: string;
  headline: string;
  href: string;
};

const STATIC_NEWS: Record<string, Omit<NewsItem, "id" | "date">[]> = {
  AAPL: [
    {
      headline: "Services revenue continues to anchor Apple's recurring growth story.",
      href: "#",
    },
    {
      headline: "Analysts watch iPhone cycle demand ahead of the next product refresh.",
      href: "#",
    },
  ],
  MSFT: [
    {
      headline: "Cloud and AI workloads remain the primary drivers of margin expansion.",
      href: "#",
    },
  ],
  NVDA: [
    {
      headline: "Data-center GPU demand stays in focus as hyperscalers scale AI capex.",
      href: "#",
    },
  ],
};

export function buildNewsItems(
  symbol: string,
  alerts: AlertItem[],
): NewsItem[] {
  const fromAlerts: NewsItem[] = alerts
    .filter((a) => a.symbol === symbol)
    .slice(0, 3)
    .map((a) => ({
      id: `alert-${a.id}`,
      date: fmtDate(a.created_at),
      headline: a.message,
      href: "#",
    }));

  const staticItems = (STATIC_NEWS[symbol] ?? [
    {
      headline: `${symbol} daily close and Prophet forecast update after market close.`,
      href: "#",
    },
    {
      headline: "Model pipeline retrains on end-of-day history stored in PostgreSQL.",
      href: "#",
    },
  ]).map((item, i) => ({
    id: `static-${symbol}-${i}`,
    date: "Today",
    ...item,
  }));

  return [...fromAlerts, ...staticItems].slice(0, 5);
}
