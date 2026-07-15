import { z } from "zod";

import type { AssetCatalogProvider } from "../application/ports";

const tickerSymbolSchema = z.string().regex(/^[A-Z0-9]{4,12}$/);

const brapiQuoteResultSchema = z
  .object({
    data: z
      .object({
        logoUrl: z.url().nullable().optional(),
        logourl: z.url().nullable().optional(),
        longName: z.string().nullable().optional(),
      })
      .passthrough(),
    requestedSymbol: z.string().optional(),
    symbol: z.string(),
  })
  .passthrough();

const brapiQuoteResponseSchema = z
  .object({
    results: z.array(brapiQuoteResultSchema),
  })
  .passthrough();

type FetchFn = typeof fetch;

type BrapiAssetCatalogProviderOptions = {
  apiToken?: string;
  fetchFn?: FetchFn;
};

export function createBrapiAssetCatalogProvider({
  apiToken = process.env.BRAPI_API_TOKEN,
  fetchFn = fetch,
}: BrapiAssetCatalogProviderOptions = {}): AssetCatalogProvider {
  return {
    async resolveSymbol(symbol) {
      const requestedSymbol = symbol.toUpperCase();
      const url = new URL("/api/v2/stocks/quote", "https://brapi.dev");
      url.searchParams.set("symbols", requestedSymbol);

      let response: Response;

      try {
        response = await fetchFn(url, {
          cache: "no-store",
          headers: apiToken
            ? { Authorization: `Bearer ${apiToken}` }
            : undefined,
        });
      } catch {
        return { status: "unavailable" };
      }

      if (response.status === 404) {
        return { status: "invalid" };
      }

      if (!response.ok) {
        return { status: "unavailable" };
      }

      try {
        const body = brapiQuoteResponseSchema.parse(await response.json());
        const result = body.results.find((candidate) =>
          [candidate.requestedSymbol, candidate.symbol].some(
            (value) => value?.toUpperCase() === requestedSymbol,
          ),
        );

        if (!result) {
          return { status: "invalid" };
        }

        const parsedSymbol = tickerSymbolSchema.safeParse(
          result.symbol.toUpperCase(),
        );

        if (!parsedSymbol.success) {
          return { status: "invalid" };
        }

        const longName = result.data.longName?.trim() || parsedSymbol.data;
        const resolvedLogoUrl =
          result.data.logoUrl ?? result.data.logourl ?? null;
        const logoUrl = isGenericBrapiLogo(resolvedLogoUrl)
          ? null
          : resolvedLogoUrl;

        return {
          asset: { logoUrl, longName, symbol: parsedSymbol.data },
          status: "resolved",
        };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}

function isGenericBrapiLogo(logoUrl: string | null) {
  if (!logoUrl) return false;

  try {
    return new URL(logoUrl).pathname.toUpperCase().endsWith("/BRAPI.SVG");
  } catch {
    return false;
  }
}
