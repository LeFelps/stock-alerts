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

const brapiQuoteSchema = z
  .object({
    currency: z.string().optional(),
    historicalDataPrice: z.array(brapiHistoricalPriceSchema).optional(),
    regularMarketDayHigh: z.number().nullable().optional(),
    regularMarketDayLow: z.number().nullable().optional(),
    regularMarketOpen: z.number().nullable().optional(),
    regularMarketPrice: z.number().nullable().optional(),
    regularMarketTime: z.string().nullable().optional(),
    regularMarketVolume: z.number().nullable().optional(),
    symbol: z.string(),
  })
  .passthrough();

const brapiQuoteResponseSchema = z
  .object({
    results: z.array(brapiQuoteSchema),
  })
  .passthrough();

type FetchFn = typeof fetch;

type BrapiMarketDataProviderOptions = {
  apiKey?: string;
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
  apiKey = process.env.MARKET_DATA_API_KEY,
  fetchFn = fetch,
  range = "1y",
}: BrapiMarketDataProviderOptions = {}): MarketDataProvider {
  return {
    async fetchDailyPrices(symbol) {
      const url = new URL(
        `/api/quote/${encodeURIComponent(symbol)}`,
        "https://brapi.dev",
      );
      url.searchParams.set("range", range);
      url.searchParams.set("interval", "1d");

      const response = await fetchFn(url, {
        cache: "no-store",
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      });

      if (!response.ok) {
        throw new MarketDataProviderError("Failed to fetch market data", {
          body: await response.text(),
          status: response.status,
        });
      }

      const body = brapiQuoteResponseSchema.parse(await response.json());
      const quote = body.results.find(
        (result) => result.symbol.toUpperCase() === symbol.toUpperCase(),
      );

      if (!quote) {
        throw new MarketDataProviderError("Market data response was empty");
      }

      return normalizeQuote(quote);
    },
  };
}

function normalizeQuote(quote: z.infer<typeof brapiQuoteSchema>) {
  const fetchedAt = new Date();
  const snapshots = [
    ...(quote.historicalDataPrice ?? []).map((price) =>
      normalizeHistoricalPrice(quote, price, fetchedAt),
    ),
    normalizeCurrentQuote(quote, fetchedAt),
  ].filter((snapshot): snapshot is PriceSnapshot => Boolean(snapshot));

  return [...dedupeByMarketDate(snapshots).values()].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
}

function normalizeHistoricalPrice(
  quote: z.infer<typeof brapiQuoteSchema>,
  price: z.infer<typeof brapiHistoricalPriceSchema>,
  fetchedAt: Date,
): PriceSnapshot {
  return {
    adjustedClose: price.adjustedClose ?? null,
    close: price.close,
    currency: quote.currency ?? "BRL",
    fetchedAt,
    high: price.high ?? null,
    low: price.low ?? null,
    marketDate: marketDateFromUnixSeconds(price.date),
    open: price.open ?? null,
    rawPayload: toRecord(price),
    source: BRAPI_SOURCE,
    symbol: quote.symbol.toUpperCase(),
    volume: price.volume ?? null,
  };
}

function normalizeCurrentQuote(
  quote: z.infer<typeof brapiQuoteSchema>,
  fetchedAt: Date,
): PriceSnapshot | null {
  const marketDate = marketDateFromIso(quote.regularMarketTime);

  if (!marketDate || quote.regularMarketPrice == null) {
    return null;
  }

  return {
    adjustedClose: quote.regularMarketPrice,
    close: quote.regularMarketPrice,
    currency: quote.currency ?? "BRL",
    fetchedAt,
    high: quote.regularMarketDayHigh ?? null,
    low: quote.regularMarketDayLow ?? null,
    marketDate,
    open: quote.regularMarketOpen ?? null,
    rawPayload: toRecord(quote),
    source: BRAPI_SOURCE,
    symbol: quote.symbol.toUpperCase(),
    volume: quote.regularMarketVolume ?? null,
  };
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

function marketDateFromIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toRecord(value: unknown): Record<string, unknown> {
  return z.record(z.string(), z.unknown()).parse(value);
}
