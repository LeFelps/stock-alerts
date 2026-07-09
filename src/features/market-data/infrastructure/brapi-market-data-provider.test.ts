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
      apiKey: "secret-token",
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

  it("throws provider errors with response metadata", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("rate limited", { status: 429 }));
    const provider = createBrapiMarketDataProvider({ fetchFn });

    await expect(provider.fetchDailyPrices("PETR4")).rejects.toMatchObject({
      metadata: { body: "rate limited", status: 429 },
      name: "MarketDataProviderError",
    } satisfies Partial<MarketDataProviderError>);
  });
});
