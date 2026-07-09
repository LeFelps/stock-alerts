import type { ProfileId } from "@/features/profiles/domain/profile";
import type { WatchlistRepository } from "@/features/watchlist/application/ports";
import type { WatchlistItemId } from "@/features/watchlist/domain/watchlist-item";
import { calculateIndicatorSnapshotsFromPrices } from "@/features/indicators/application/calculate-indicators";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import { detectBuySignalsForProfile } from "@/features/signals/application/detect-buy-signals";
import type { SignalRepository } from "@/features/signals/application/ports";

import { err, ok, type Result } from "./result";
import type { MarketDataProvider, PriceSnapshotRepository } from "./ports";

type MarketDataDependencies = {
  indicatorSnapshotRepository: IndicatorSnapshotRepository;
  marketDataProvider: MarketDataProvider;
  priceSnapshotRepository: PriceSnapshotRepository;
  signalRepository: SignalRepository;
  watchlistRepository: WatchlistRepository;
};

type RefreshMarketDataError = { type: "watchlist_item_not_found" };

export async function refreshMarketDataForWatchlistItem(
  command: { itemId: WatchlistItemId; profileId: ProfileId },
  {
    indicatorSnapshotRepository,
    marketDataProvider,
    priceSnapshotRepository,
    signalRepository,
    watchlistRepository,
  }: MarketDataDependencies,
): Promise<
  Result<{ latestMarketDate: string | null }, RefreshMarketDataError>
> {
  const item = await watchlistRepository.findByIdForProfile(command);

  if (!item) {
    return err({ type: "watchlist_item_not_found" });
  }

  const snapshots = await marketDataProvider.fetchDailyPrices(item.symbol);
  const indicatorSnapshots = calculateIndicatorSnapshotsFromPrices(snapshots);
  const buySignals = detectBuySignalsForProfile({
    indicatorSnapshots,
    profileId: command.profileId,
  });

  await priceSnapshotRepository.upsertMany(snapshots);
  await indicatorSnapshotRepository.upsertMany(indicatorSnapshots);
  await signalRepository.upsertMany(buySignals);

  return ok({
    latestMarketDate: latestMarketDateFrom(snapshots),
  });
}

export async function listLatestMarketDataDatesForSymbols(
  command: { symbols: string[] },
  {
    priceSnapshotRepository,
  }: Pick<MarketDataDependencies, "priceSnapshotRepository">,
) {
  const uniqueSymbols = [...new Set(command.symbols)];

  if (uniqueSymbols.length === 0) {
    return new Map<string, string>();
  }

  return priceSnapshotRepository.latestMarketDatesBySymbol(uniqueSymbols);
}

function latestMarketDateFrom(snapshots: { marketDate: string }[]) {
  return snapshots.reduce<string | null>(
    (latestMarketDate, snapshot) =>
      !latestMarketDate || snapshot.marketDate > latestMarketDate
        ? snapshot.marketDate
        : latestMarketDate,
    null,
  );
}
