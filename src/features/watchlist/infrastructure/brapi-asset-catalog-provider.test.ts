import { describe, expect, it, vi } from "vitest";

import { createBrapiAssetCatalogProvider } from "./brapi-asset-catalog-provider";

describe("brapi asset catalog provider", () => {
  it("resolves a symbol and sends the configured token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            data: {
              logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
              longName: " Petróleo Brasileiro S.A. - Petrobras ",
            },
            requestedSymbol: "PETR4",
            symbol: "PETR4",
          },
        ],
      }),
    );
    const provider = createBrapiAssetCatalogProvider({
      apiToken: "secret-token",
      fetchFn,
    });

    await expect(provider.resolveSymbol("PETR4")).resolves.toEqual({
      asset: {
        logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
        longName: "Petróleo Brasileiro S.A. - Petrobras",
        symbol: "PETR4",
      },
      status: "resolved",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      new URL("https://brapi.dev/api/v2/stocks/quote?symbols=PETR4"),
      {
        cache: "no-store",
        headers: { Authorization: "Bearer secret-token" },
      },
    );
  });

  it("uses the canonical symbol returned for a renamed ticker", async () => {
    const provider = createProvider({
      results: [
        {
          data: {
            logoUrl: "https://icons.brapi.dev/icons/NEW3.svg",
            longName: "Companhia Nova S.A.",
          },
          requestedSymbol: "OLD3",
          symbol: "NEW3",
        },
      ],
    });

    await expect(provider.resolveSymbol("OLD3")).resolves.toEqual({
      asset: {
        logoUrl: "https://icons.brapi.dev/icons/NEW3.svg",
        longName: "Companhia Nova S.A.",
        symbol: "NEW3",
      },
      status: "resolved",
    });
  });

  it.each([undefined, null, "   "])(
    "falls back to the canonical symbol when longName is %s",
    async (longName) => {
      const provider = createProvider({
        results: [
          {
            data: { longName },
            requestedSymbol: "PETR4",
            symbol: "PETR4",
          },
        ],
      });

      await expect(provider.resolveSymbol("PETR4")).resolves.toEqual({
        asset: { logoUrl: null, longName: "PETR4", symbol: "PETR4" },
        status: "resolved",
      });
    },
  );

  it("normalizes the legacy logourl spelling when logoUrl is absent", async () => {
    const provider = createProvider({
      results: [
        {
          data: {
            logourl: "https://icons.brapi.dev/icons/PETR4.svg",
            longName: "Petróleo Brasileiro S.A.",
          },
          requestedSymbol: "PETR4",
          symbol: "PETR4",
        },
      ],
    });

    await expect(provider.resolveSymbol("PETR4")).resolves.toEqual({
      asset: {
        logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
        longName: "Petróleo Brasileiro S.A.",
        symbol: "PETR4",
      },
      status: "resolved",
    });
  });

  it("returns invalid for a missing or unsupported symbol", async () => {
    const missingProvider = createBrapiAssetCatalogProvider({
      fetchFn: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    });
    const mismatchedProvider = createProvider({
      results: [
        {
          data: { longName: "VALE ON" },
          requestedSymbol: "VALE3",
          symbol: "VALE3",
        },
      ],
    });
    const unsupportedProvider = createProvider({
      results: [
        {
          data: { longName: "Índice" },
          requestedSymbol: "TEST4",
          symbol: "^BVSP",
        },
      ],
    });

    await expect(missingProvider.resolveSymbol("FAKE4")).resolves.toEqual({
      status: "invalid",
    });
    await expect(mismatchedProvider.resolveSymbol("PETR4")).resolves.toEqual({
      status: "invalid",
    });
    await expect(unsupportedProvider.resolveSymbol("TEST4")).resolves.toEqual({
      status: "invalid",
    });
  });

  it.each([401, 403, 429, 500])(
    "returns unavailable for HTTP %s",
    async (status) => {
      const provider = createBrapiAssetCatalogProvider({
        fetchFn: vi.fn().mockResolvedValue(new Response(null, { status })),
      });

      await expect(provider.resolveSymbol("PETR4")).resolves.toEqual({
        status: "unavailable",
      });
    },
  );

  it("returns unavailable for network and malformed response failures", async () => {
    const networkProvider = createBrapiAssetCatalogProvider({
      fetchFn: vi.fn().mockRejectedValue(new Error("network failed")),
    });
    const malformedProvider = createProvider({ results: "not-an-array" });

    await expect(networkProvider.resolveSymbol("PETR4")).resolves.toEqual({
      status: "unavailable",
    });
    await expect(malformedProvider.resolveSymbol("PETR4")).resolves.toEqual({
      status: "unavailable",
    });
  });
});

function createProvider(body: unknown) {
  return createBrapiAssetCatalogProvider({
    fetchFn: vi.fn().mockResolvedValue(jsonResponse(body)),
  });
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
