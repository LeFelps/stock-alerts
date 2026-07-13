import type { PriceSnapshot } from "../domain/price-snapshot";

export type MarketDataDateWindow = {
  endDate: string;
  startDate: string;
};

export type MarketDataProvider = {
  fetchDailyPrices(
    symbol: string,
    window?: MarketDataDateWindow,
  ): Promise<PriceSnapshot[]>;
};

export type PriceSnapshotRepository = {
  listForSymbol(symbol: string): Promise<PriceSnapshot[]>;
  upsertMany(snapshots: PriceSnapshot[]): Promise<void>;
};
