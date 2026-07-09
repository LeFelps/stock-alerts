import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";

import type { IndicatorSnapshot } from "../domain/indicator-snapshot";

export type IndicatorInputRow = {
  close: number;
  marketDate: string;
};

export type CalculatedIndicatorRow = IndicatorInputRow & {
  ema6: number | null;
  ema13: number | null;
  ema42: number | null;
};

export function calculateEMA(prices: number[], period: number) {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("EMA period must be a positive integer");
  }

  const values: Array<number | null> = Array(prices.length).fill(null);

  if (prices.length < period) {
    return values;
  }

  const multiplier = 2 / (period + 1);
  const seed =
    prices.slice(0, period).reduce((total, price) => total + price, 0) / period;
  values[period - 1] = seed;

  for (let index = period; index < prices.length; index += 1) {
    const previous = values[index - 1];

    if (previous == null) {
      throw new Error("EMA seed was not initialized");
    }

    values[index] = prices[index] * multiplier + previous * (1 - multiplier);
  }

  return values;
}

export function calculateIndicators(
  rows: IndicatorInputRow[],
): CalculatedIndicatorRow[] {
  const sortedRows = [...rows].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
  const closes = sortedRows.map((row) => row.close);
  const ema6 = calculateEMA(closes, 6);
  const ema13 = calculateEMA(closes, 13);
  const ema42 = calculateEMA(closes, 42);

  return sortedRows.map((row, index) => ({
    ...row,
    ema6: ema6[index],
    ema13: ema13[index],
    ema42: ema42[index],
  }));
}

export function calculateIndicatorSnapshotsFromPrices(
  snapshots: PriceSnapshot[],
): IndicatorSnapshot[] {
  if (snapshots.length === 0) {
    return [];
  }

  const [firstSnapshot] = snapshots;

  if (!firstSnapshot) {
    return [];
  }

  return calculateIndicators(
    snapshots.map((snapshot) => ({
      close: snapshot.close,
      marketDate: snapshot.marketDate,
    })),
  ).map((row) => ({
    ...row,
    source: firstSnapshot.source,
    symbol: firstSnapshot.symbol,
  }));
}
