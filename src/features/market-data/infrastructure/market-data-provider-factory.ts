import { z } from "zod";

import type { MarketDataProvider } from "../application/ports";
import { createBrapiMarketDataProvider } from "./brapi-market-data-provider";

const marketDataProviderSchema = z.enum(["brapi"]).default("brapi");

export function createConfiguredMarketDataProvider(
  env: NodeJS.ProcessEnv = process.env,
): MarketDataProvider {
  const providerName = marketDataProviderSchema.parse(env.MARKET_DATA_PROVIDER);

  switch (providerName) {
    case "brapi":
      return createBrapiMarketDataProvider({
        apiToken: env.BRAPI_API_TOKEN,
      });
  }
}
