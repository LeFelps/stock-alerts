import type { IndicatorSnapshot } from "../domain/indicator-snapshot";

export type IndicatorSnapshotRepository = {
  latestBySymbol(symbols: string[]): Promise<Map<string, IndicatorSnapshot>>;
  listForSymbol(symbol: string): Promise<IndicatorSnapshot[]>;
  upsertMany(snapshots: IndicatorSnapshot[]): Promise<void>;
};
