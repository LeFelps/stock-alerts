import { z } from "zod";

import { BRAPI_SOURCE, type PriceSnapshot } from "../domain/price-snapshot";
import type { MarketDataProvider } from "../application/ports";

const brapiHistoricalPriceSchema = z
  .object({
    adjustedClose: z.number().nullable().optional(),
    close: z.number(),
    date: z.number(),
    high: z.number().nullable().optional(),
    low: z.number().nullable().optional(),
    open: z.number().nullable().optional(),
    volume: z.number().nullable().optional(),
  })
  .passthrough();

const brapiHistoricalResultSchema = z
  .object({
    data: z
      .object({
        historicalDataPrice: z.array(brapiHistoricalPriceSchema).optional(),
      })
      .passthrough(),
    requestedSymbol: z.string().optional(),
    symbol: z.string(),
  })
  .passthrough();

const brapiHistoricalResponseSchema = z
  .object({
    results: z.array(brapiHistoricalResultSchema),
  })
  .passthrough();

type FetchFn = typeof fetch;

type BrapiMarketDataProviderOptions = {
  apiToken?: string;
  fetchFn?: FetchFn;
  range?: string;
};

export class MarketDataProviderError extends Error {
  constructor(
    message: string,
    readonly metadata: { body?: string; status?: number } = {},
  ) {
    super(message);
    this.name = "MarketDataProviderError";
  }
}

export function createBrapiMarketDataProvider({
  apiToken = process.env.BRAPI_API_TOKEN,
  fetchFn = fetch,
  range = "1y",
}: BrapiMarketDataProviderOptions = {}): MarketDataProvider {
  return {
    async fetchDailyPrices(symbol) {
      const url = new URL(
        "/api/v2/stocks/historical",
        "https://brapi.dev",
      );
      url.searchParams.set("symbols", symbol);
      url.searchParams.set("range", range);
      url.searchParams.set("interval", "1d");
      url.searchParams.set("sortOrder", "asc");

      const response = await fetchFn(url, {
        cache: "no-store",
        headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
      });

      if (!response.ok) {
        throw new MarketDataProviderError("Failed to fetch market data", {
          body: await response.text(),
          status: response.status,
        });
      }

      const normalizedRequestedSymbol = symbol.toUpperCase();
      const body = brapiHistoricalResponseSchema.parse(await response.json());
      const result = body.results.find((result) =>
        matchesRequestedSymbol(result, normalizedRequestedSymbol),
      );

      if (!result) {
        throw new MarketDataProviderError("Market data response was empty");
      }

      return normalizeHistoricalResult(result, normalizedRequestedSymbol);
    },
  };
}

function normalizeHistoricalResult(
  result: z.infer<typeof brapiHistoricalResultSchema>,
  symbol: string,
) {
  const fetchedAt = new Date();
  const snapshots = (result.data.historicalDataPrice ?? []).map((price) =>
    normalizeHistoricalPrice(price, fetchedAt, symbol),
  );

  return [...dedupeByMarketDate(snapshots).values()].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
}

function normalizeHistoricalPrice(
  price: z.infer<typeof brapiHistoricalPriceSchema>,
  fetchedAt: Date,
  symbol: string,
): PriceSnapshot {
  return {
    adjustedClose: price.adjustedClose ?? null,
    close: price.close,
    currency: "BRL",
    fetchedAt,
    high: price.high ?? null,
    low: price.low ?? null,
    marketDate: marketDateFromUnixSeconds(price.date),
    open: price.open ?? null,
    rawPayload: toRecord(price),
    source: BRAPI_SOURCE,
    symbol,
    volume: price.volume ?? null,
  };
}

function matchesRequestedSymbol(
  result: z.infer<typeof brapiHistoricalResultSchema>,
  symbol: string,
) {
  return [result.symbol, result.requestedSymbol].some(
    (candidate) => candidate?.toUpperCase() === symbol,
  );
}

function dedupeByMarketDate(snapshots: PriceSnapshot[]) {
  return snapshots.reduce<Map<string, PriceSnapshot>>((deduped, snapshot) => {
    deduped.set(snapshot.marketDate, snapshot);
    return deduped;
  }, new Map());
}

function marketDateFromUnixSeconds(value: number) {
  return new Date(value * 1000).toISOString().slice(0, 10);
}

function toRecord(value: unknown): Record<string, unknown> {
  return z.record(z.string(), z.unknown()).parse(value);
}
