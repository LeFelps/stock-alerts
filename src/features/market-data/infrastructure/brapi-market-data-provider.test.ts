import { describe, expect, it, vi } from "vitest";

import {
  createBrapiMarketDataProvider,
  MarketDataProviderError,
} from "./brapi-market-data-provider";

describe("brapi market data provider", () => {
  it("fetches daily history and normalizes price snapshots", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              changed: false,
              data: {
                historicalDataPrice: [
                  {
                    adjustedClose: 30.65,
                    close: 30.65,
                    date: 1756126800,
                    high: 30.78,
                    low: 30.42,
                    open: 30.47,
                    volume: 21075300,
                  },
                  {
                    adjustedClose: 31.1,
                    close: 31.1,
                    date: 1756479600,
                    high: 31.35,
                    low: 30.85,
                    open: 30.54,
                    volume: 27713400,
                  },
                ],
                usedInterval: "1d",
                usedRange: "5d",
              },
              requestedSymbol: "PETR4",
              symbol: "PETR4",
            },
          ],
        }),
      ),
    );

    const provider = createBrapiMarketDataProvider({
      apiToken: "secret-token",
      fetchFn,
      range: "5d",
    });

    const snapshots = await provider.fetchDailyPrices("PETR4");

    expect(fetchFn).toHaveBeenCalledWith(
      new URL(
        "https://brapi.dev/api/v2/stocks/historical?symbols=PETR4&range=5d&interval=1d&sortOrder=asc",
      ),
      {
        cache: "no-store",
        headers: { Authorization: "Bearer secret-token" },
      },
    );
    expect(snapshots).toMatchObject([
      {
        close: 30.65,
        marketDate: "2025-08-25",
        source: "brapi",
        symbol: "PETR4",
      },
      {
        close: 31.1,
        marketDate: "2025-08-29",
        source: "brapi",
        symbol: "PETR4",
      },
    ]);
    expect(snapshots[0]?.rawPayload).toMatchObject({ close: 30.65 });
  });

  it("matches renamed tickers by requestedSymbol and keeps the requested symbol", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              changed: true,
              data: {
                historicalDataPrice: [
                  {
                    close: 12.34,
                    date: 1756126800,
                  },
                ],
              },
              requestedSymbol: "OLD3",
              symbol: "NEW3",
            },
          ],
        }),
      ),
    );
    const provider = createBrapiMarketDataProvider({ fetchFn });

    const snapshots = await provider.fetchDailyPrices("OLD3");

    expect(snapshots).toMatchObject([
      {
        close: 12.34,
        marketDate: "2025-08-25",
        source: "brapi",
        symbol: "OLD3",
      },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      new URL(
        "https://brapi.dev/api/v2/stocks/historical?symbols=OLD3&range=3mo&interval=1d&sortOrder=asc",
      ),
      expect.any(Object),
    );
  });

  it("splits date-bounded history into at most 90 inclusive-day requests", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(() => createSuccessfulResponse());
    const provider = createBrapiMarketDataProvider({ fetchFn });

    const snapshots = await provider.fetchDailyPrices("PETR4", {
      endDate: "2026-04-13",
      startDate: "2026-01-13",
    });

    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      new URL(
        "https://brapi.dev/api/v2/stocks/historical?symbols=PETR4&startDate=2026-01-13&endDate=2026-04-12&interval=1d&sortOrder=asc",
      ),
      expect.any(Object),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      new URL(
        "https://brapi.dev/api/v2/stocks/historical?symbols=PETR4&startDate=2026-04-13&endDate=2026-04-13&interval=1d&sortOrder=asc",
      ),
      expect.any(Object),
    );
    expect(snapshots).toHaveLength(1);
  });

  it("discards incomplete historical rows whose close is null", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              data: {
                historicalDataPrice: [
                  { close: 10.89, date: 1769691600 },
                  {
                    adjustedClose: null,
                    close: null,
                    date: 1769778000,
                    high: null,
                    low: null,
                    open: null,
                    volume: null,
                  },
                  { close: 10.83, date: 1770037200 },
                ],
              },
              requestedSymbol: "AZUL3",
              symbol: "AZUL3",
            },
          ],
        }),
      ),
    );
    const provider = createBrapiMarketDataProvider({ fetchFn });

    const snapshots = await provider.fetchDailyPrices("AZUL3");

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((snapshot) => snapshot.marketDate)).toEqual([
      "2026-01-29",
      "2026-02-02",
    ]);
  });

  it("keeps successful split data when the trailing window has no history", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(createSuccessfulResponse(1768309200))
      .mockResolvedValueOnce(createSuccessfulResponse(1776085200))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "NOT_FOUND",
            error: true,
            message: "Nenhum histórico encontrado para os símbolos informados",
          }),
          { status: 404 },
        ),
      );
    const provider = createBrapiMarketDataProvider({ fetchFn });

    const snapshots = await provider.fetchDailyPrices("PETR4", {
      endDate: "2026-07-13",
      startDate: "2026-01-13",
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(snapshots).toHaveLength(2);
  });

  it("reports NOT_FOUND when no earlier split established the symbol", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "NOT_FOUND",
          error: true,
          message: "Nenhum histórico encontrado para os símbolos informados",
        }),
        { status: 404 },
      ),
    );
    const provider = createBrapiMarketDataProvider({ fetchFn });

    await expect(
      provider.fetchDailyPrices("UNKNOWN3", {
        endDate: "2026-07-13",
        startDate: "2026-07-12",
      }),
    ).rejects.toMatchObject({
      metadata: { status: 404 },
      name: "MarketDataProviderError",
    } satisfies Partial<MarketDataProviderError>);
  });

  it("retries transient service failures before succeeding", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(createSuccessfulResponse());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = createBrapiMarketDataProvider({ fetchFn, sleep });

    const snapshots = await provider.fetchDailyPrices("PETR4");

    expect(snapshots).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("does not retry invalid requests", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        new Response('{"code":"INVALID_RANGE"}', { status: 400 }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = createBrapiMarketDataProvider({ fetchFn, sleep });

    await expect(provider.fetchDailyPrices("PETR4")).rejects.toMatchObject({
      metadata: { body: '{"code":"INVALID_RANGE"}', status: 400 },
      name: "MarketDataProviderError",
    } satisfies Partial<MarketDataProviderError>);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws provider errors with response metadata", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response("rate limited", { status: 429 })),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const provider = createBrapiMarketDataProvider({ fetchFn, sleep });

    await expect(provider.fetchDailyPrices("PETR4")).rejects.toMatchObject({
      metadata: { body: "rate limited", status: 429 },
      name: "MarketDataProviderError",
    } satisfies Partial<MarketDataProviderError>);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

function createSuccessfulResponse(date = 1756126800) {
  return new Response(
    JSON.stringify({
      results: [
        {
          data: {
            historicalDataPrice: [{ close: 30.65, date }],
          },
          requestedSymbol: "PETR4",
          symbol: "PETR4",
        },
      ],
    }),
  );
}
