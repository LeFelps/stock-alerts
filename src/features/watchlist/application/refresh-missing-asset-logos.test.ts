import { describe, expect, it, vi } from "vitest";

import type { AssetCatalogProvider, AssetLogoRefreshRepository } from "./ports";
import { refreshMissingAssetLogos } from "./refresh-missing-asset-logos";

describe("refreshMissingAssetLogos", () => {
  it("refreshes usable logos and keeps processing after unresolved symbols", async () => {
    const assetCatalogProvider: AssetCatalogProvider = {
      resolveSymbol: vi.fn(async (symbol) => {
        if (symbol === "KNCR11") {
          return {
            asset: {
              logoUrl: "https://icons.brapi.dev/icons/KNCR11.svg",
              longName: "Kinea Rendimentos Imobiliários",
              symbol,
            },
            status: "resolved" as const,
          };
        }

        if (symbol === "MXRF11") {
          return {
            asset: { logoUrl: null, longName: "Maxi Renda", symbol },
            status: "resolved" as const,
          };
        }

        return { status: "unavailable" as const };
      }),
    };
    const assetLogoRefreshRepository: AssetLogoRefreshRepository = {
      listMissingLogoSymbols: vi
        .fn()
        .mockResolvedValue(["KNCR11", "MXRF11", "HGLG11"]),
      updateMissingLogo: vi.fn().mockResolvedValue(2),
    };

    await expect(
      refreshMissingAssetLogos(
        {},
        { assetCatalogProvider, assetLogoRefreshRepository },
      ),
    ).resolves.toEqual({
      checkedSymbols: 3,
      refreshedSymbols: 1,
      unresolvedSymbols: 2,
      updatedItems: 2,
    });
    expect(assetLogoRefreshRepository.updateMissingLogo).toHaveBeenCalledWith({
      logoUrl: "https://icons.brapi.dev/icons/KNCR11.svg",
      longName: "Kinea Rendimentos Imobiliários",
      symbol: "KNCR11",
    });
  });

  it("limits each run and isolates an unexpected provider failure", async () => {
    const assetCatalogProvider: AssetCatalogProvider = {
      resolveSymbol: vi.fn().mockRejectedValue(new Error("network failed")),
    };
    const assetLogoRefreshRepository: AssetLogoRefreshRepository = {
      listMissingLogoSymbols: vi.fn().mockResolvedValue(["KNCR11", "MXRF11"]),
      updateMissingLogo: vi.fn(),
    };

    await expect(
      refreshMissingAssetLogos(
        { limit: 1 },
        { assetCatalogProvider, assetLogoRefreshRepository },
      ),
    ).resolves.toEqual({
      checkedSymbols: 1,
      refreshedSymbols: 0,
      unresolvedSymbols: 1,
      updatedItems: 0,
    });
    expect(assetCatalogProvider.resolveSymbol).toHaveBeenCalledTimes(1);
    expect(assetLogoRefreshRepository.updateMissingLogo).not.toHaveBeenCalled();
  });
});
