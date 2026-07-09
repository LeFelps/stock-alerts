import { describe, expect, it } from "vitest";

import { createConfiguredMarketDataProvider } from "./market-data-provider-factory";

describe("market data provider factory", () => {
  it("defaults to brapi when no provider is configured", () => {
    const provider = createConfiguredMarketDataProvider({});

    expect(provider).toHaveProperty("fetchDailyPrices");
  });

  it("rejects unsupported providers", () => {
    expect(() =>
      createConfiguredMarketDataProvider({
        MARKET_DATA_PROVIDER: "unknown",
      }),
    ).toThrow();
  });
});
