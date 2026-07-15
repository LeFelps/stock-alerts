import type { AssetCatalogProvider, AssetLogoRefreshRepository } from "./ports";

const DEFAULT_REFRESH_LIMIT = 25;

type RefreshMissingAssetLogosDependencies = {
  assetCatalogProvider: AssetCatalogProvider;
  assetLogoRefreshRepository: AssetLogoRefreshRepository;
  now?: () => Date;
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
    now = () => new Date(),
  }: RefreshMissingAssetLogosDependencies,
): Promise<RefreshMissingAssetLogosSummary> {
  const limit = normalizeLimit(command.limit);
  const missingSymbols = [
    ...new Set(await assetLogoRefreshRepository.listMissingLogoSymbols()),
  ];
  const symbols = selectDailyCandidates(missingSymbols, limit, now());
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

function selectDailyCandidates(symbols: string[], limit: number, now: Date) {
  if (symbols.length <= limit) return symbols;

  const utcDay = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      (24 * 60 * 60 * 1000),
  );
  const startIndex = (utcDay * limit) % symbols.length;

  return Array.from(
    { length: limit },
    (_, index) => symbols[(startIndex + index) % symbols.length],
  );
}
