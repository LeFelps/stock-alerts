import type { PriceSnapshot } from "../domain/price-snapshot";

export type MarketDataProvider = {
  fetchDailyPrices(symbol: string): Promise<PriceSnapshot[]>;
};

export type PriceSnapshotRepository = {
  latestMarketDatesBySymbol(symbols: string[]): Promise<Map<string, string>>;
  listForSymbol(symbol: string, limit?: number): Promise<PriceSnapshot[]>;
  upsertMany(snapshots: PriceSnapshot[]): Promise<void>;
};
