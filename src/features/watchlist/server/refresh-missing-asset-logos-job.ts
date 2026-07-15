import { refreshMissingAssetLogos } from "../application/refresh-missing-asset-logos";
import { createBrapiAssetCatalogProvider } from "../infrastructure/brapi-asset-catalog-provider";
import { createDrizzleAssetLogoRefreshRepository } from "../infrastructure/drizzle-asset-logo-refresh-repository";

export async function runRefreshMissingAssetLogosJob() {
  return refreshMissingAssetLogos(
    {},
    {
      assetCatalogProvider: createBrapiAssetCatalogProvider(),
      assetLogoRefreshRepository: createDrizzleAssetLogoRefreshRepository(),
    },
  );
}
