import type { PricePoint } from "../api/client";

export type TimeRange = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y";

export const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

const RANGE_DAYS: Record<TimeRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
  "5Y": 1825,
};

export type ChartRow = {
  ts: string;
  close: number;
  volume: number | null;
  label: string;
};

export function filterByRange(
  points: PricePoint[],
  range: TimeRange,
): PricePoint[] {
  if (!points.length) return [];
  const last = new Date(points[points.length - 1].ts).getTime();
  const cutoff = last - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return points.filter((p) => new Date(p.ts).getTime() >= cutoff);
}
