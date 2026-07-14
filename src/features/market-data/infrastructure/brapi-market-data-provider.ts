import { z } from "zod";

import { BRAPI_SOURCE, type PriceSnapshot } from "../domain/price-snapshot";
import type { MarketDataProvider } from "../application/ports";

const brapiHistoricalPriceSchema = z
  .object({
    adjustedClose: z.number().nullable().optional(),
    close: z.number().nullable(),
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

const brapiErrorResponseSchema = z
  .object({
    code: z.string(),
  })
  .passthrough();

const brapiHistoricalRangeSchema = z.enum(["1d", "5d", "1mo", "3mo"]);
const brapiDateWindowSchema = z
  .object({
    endDate: z.iso.date(),
    startDate: z.iso.date(),
  })
  .refine((window) => window.startDate <= window.endDate, {
    message: "Market data start date must not follow end date",
  });

const BRAPI_MAX_INCLUSIVE_WINDOW_DAYS = 90;
const MAX_FETCH_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;

type FetchFn = typeof fetch;
type SleepFn = (delayMs: number) => Promise<void>;

type BrapiMarketDataProviderOptions = {
  apiToken?: string;
  fetchFn?: FetchFn;
  range?: z.infer<typeof brapiHistoricalRangeSchema>;
  sleep?: SleepFn;
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
  range = "3mo",
  sleep = wait,
}: BrapiMarketDataProviderOptions = {}): MarketDataProvider {
  const validatedRange = brapiHistoricalRangeSchema.parse(range);

  return {
    async fetchDailyPrices(symbol, window) {
      const validatedWindow = brapiDateWindowSchema.optional().parse(window);
      const requestWindows = validatedWindow
        ? splitBrapiDateWindow(validatedWindow)
        : [undefined];
      const snapshots: PriceSnapshot[] = [];

      for (const [requestIndex, requestWindow] of requestWindows.entries()) {
        const url = historicalUrl(symbol, validatedRange, requestWindow);
        const response = await fetchWithRetry({
          fetchFn,
          init: {
            cache: "no-store",
            headers: apiToken
              ? { Authorization: `Bearer ${apiToken}` }
              : undefined,
          },
          sleep,
          url,
        });

        if (!response.ok) {
          const responseBody = await response.text();

          if (
            isEmptyTrailingWindow({
              hasSnapshots: snapshots.length > 0,
              isLastWindow: requestIndex === requestWindows.length - 1,
              requestWindow,
              responseBody,
              status: response.status,
            })
          ) {
            continue;
          }

          throw new MarketDataProviderError("Failed to fetch market data", {
            body: responseBody,
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

        snapshots.push(
          ...normalizeHistoricalResult(result, normalizedRequestedSymbol),
        );
      }

      return [...dedupeByMarketDate(snapshots).values()].sort((left, right) =>
        left.marketDate.localeCompare(right.marketDate),
      );
    },
  };
}

function historicalUrl(
  symbol: string,
  range: z.infer<typeof brapiHistoricalRangeSchema>,
  window?: z.infer<typeof brapiDateWindowSchema>,
) {
  const url = new URL("/api/v2/stocks/historical", "https://brapi.dev");
  url.searchParams.set("symbols", symbol);

  if (window) {
    url.searchParams.set("startDate", window.startDate);
    url.searchParams.set("endDate", window.endDate);
  } else {
    url.searchParams.set("range", range);
  }

  url.searchParams.set("interval", "1d");
  url.searchParams.set("sortOrder", "asc");
  return url;
}

function splitBrapiDateWindow(window: z.infer<typeof brapiDateWindowSchema>) {
  const windows: Array<z.infer<typeof brapiDateWindowSchema>> = [];
  let windowStartDate = window.startDate;

  while (windowStartDate <= window.endDate) {
    const maximumEndDate = shiftCalendarDays(
      windowStartDate,
      BRAPI_MAX_INCLUSIVE_WINDOW_DAYS - 1,
    );
    const windowEndDate =
      maximumEndDate < window.endDate ? maximumEndDate : window.endDate;

    windows.push({ endDate: windowEndDate, startDate: windowStartDate });
    windowStartDate = shiftCalendarDays(windowEndDate, 1);
  }

  return windows;
}

function shiftCalendarDays(calendarDate: string, days: number) {
  const date = new Date(`${calendarDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function fetchWithRetry({
  fetchFn,
  init,
  sleep,
  url,
}: {
  fetchFn: FetchFn;
  init: RequestInit;
  sleep: SleepFn;
  url: URL;
}) {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchFn(url, init);

      if (
        !isTransientStatus(response.status) ||
        attempt === MAX_FETCH_ATTEMPTS
      ) {
        return response;
      }

      await response.arrayBuffer();
    } catch (error) {
      if (attempt === MAX_FETCH_ATTEMPTS) {
        throw error;
      }
    }

    await sleep(INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
  }

  throw new Error("Market data retry loop exhausted unexpectedly");
}

function isTransientStatus(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

function isEmptyTrailingWindow({
  hasSnapshots,
  isLastWindow,
  requestWindow,
  responseBody,
  status,
}: {
  hasSnapshots: boolean;
  isLastWindow: boolean;
  requestWindow: z.infer<typeof brapiDateWindowSchema> | undefined;
  responseBody: string;
  status: number;
}) {
  if (status !== 404 || !requestWindow || !hasSnapshots || !isLastWindow) {
    return false;
  }

  try {
    const error = brapiErrorResponseSchema.safeParse(JSON.parse(responseBody));
    return error.success && error.data.code === "NOT_FOUND";
  } catch {
    return false;
  }
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

function normalizeHistoricalResult(
  result: z.infer<typeof brapiHistoricalResultSchema>,
  symbol: string,
) {
  const fetchedAt = new Date();
  const snapshots = (result.data.historicalDataPrice ?? [])
    .map((price) => normalizeHistoricalPrice(price, fetchedAt, symbol))
    .filter((snapshot): snapshot is PriceSnapshot => snapshot !== null);

  return [...dedupeByMarketDate(snapshots).values()].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
}

function normalizeHistoricalPrice(
  price: z.infer<typeof brapiHistoricalPriceSchema>,
  fetchedAt: Date,
  symbol: string,
): PriceSnapshot | null {
  if (price.close === null) {
    return null;
  }

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
