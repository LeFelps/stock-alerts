export const BRAPI_SOURCE = "brapi";

export type MarketDataSource = typeof BRAPI_SOURCE;

export type PriceSnapshot = {
  adjustedClose: number | null;
  close: number;
  currency: string;
  fetchedAt: Date;
  high: number | null;
  low: number | null;
  marketDate: string;
  open: number | null;
  rawPayload: Record<string, unknown>;
  source: MarketDataSource;
  symbol: string;
  volume: number | null;
};
