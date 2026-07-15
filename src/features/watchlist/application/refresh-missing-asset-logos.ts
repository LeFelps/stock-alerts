import type { AssetCatalogProvider, AssetLogoRefreshRepository } from "./ports";

const DEFAULT_REFRESH_LIMIT = 25;

type RefreshMissingAssetLogosDependencies = {
  assetCatalogProvider: AssetCatalogProvider;
  assetLogoRefreshRepository: AssetLogoRefreshRepository;
};

export type RefreshMissingAssetLogosSummary = {
  checkedSymbols: number;
  refreshedSymbols: number;
  unresolvedSymbols: number;
  updatedItems: number;
};

export async function refreshMissingAssetLogos(
  command: { limit?: number },
  {
    assetCatalogProvider,
    assetLogoRefreshRepository,
  }: RefreshMissingAssetLogosDependencies,
): Promise<RefreshMissingAssetLogosSummary> {
  const limit = normalizeLimit(command.limit);
  const symbols = [
    ...new Set(await assetLogoRefreshRepository.listMissingLogoSymbols()),
  ].slice(0, limit);
  const summary: RefreshMissingAssetLogosSummary = {
    checkedSymbols: symbols.length,
    refreshedSymbols: 0,
    unresolvedSymbols: 0,
    updatedItems: 0,
  };

  for (const symbol of symbols) {
    try {
      const resolution = await assetCatalogProvider.resolveSymbol(symbol);

      if (resolution.status !== "resolved" || !resolution.asset.logoUrl) {
        summary.unresolvedSymbols += 1;
        continue;
      }

      const updatedItems = await assetLogoRefreshRepository.updateMissingLogo({
        logoUrl: resolution.asset.logoUrl,
        longName: resolution.asset.longName,
        symbol,
      });

      if (updatedItems > 0) {
        summary.refreshedSymbols += 1;
        summary.updatedItems += updatedItems;
      } else {
        summary.unresolvedSymbols += 1;
      }
    } catch {
      summary.unresolvedSymbols += 1;
    }
  }

  return summary;
}

function normalizeLimit(limit: number | undefined) {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_REFRESH_LIMIT;
  return Math.max(1, Math.min(DEFAULT_REFRESH_LIMIT, Math.floor(limit)));
}
