import type { ProfileId } from "@/features/profiles/domain/profile";
import type { WatchlistRepository } from "@/features/watchlist/application/ports";
import type { WatchlistItemId } from "@/features/watchlist/domain/watchlist-item";
import { deliverBuySignalAlerts } from "@/features/alerts/application/deliver-buy-signal-alerts";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "@/features/alerts/application/ports";
import { calculateIndicatorSnapshotsFromPrices } from "@/features/indicators/application/calculate-indicators";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import { detectBuySignalsForProfile } from "@/features/signals/application/detect-buy-signals";
import type { SignalRepository } from "@/features/signals/application/ports";

import { err, ok, type Result } from "./result";
import type { MarketDataProvider, PriceSnapshotRepository } from "./ports";

type MarketDataDependencies = {
  alertEmailDeliveryRepository: AlertEmailDeliveryRepository;
  emailDeliveryProvider: EmailDeliveryProvider;
  indicatorSnapshotRepository: IndicatorSnapshotRepository;
  marketDataProvider: MarketDataProvider;
  priceSnapshotRepository: PriceSnapshotRepository;
  signalRepository: SignalRepository;
  watchlistRepository: WatchlistRepository;
};

type RefreshMarketDataError = { type: "watchlist_item_not_found" };

export async function refreshMarketDataForWatchlistItem(
  command: {
    emailAlertsEnabled: boolean;
    itemId: WatchlistItemId;
    profileId: ProfileId;
    recipientEmail: string;
  },
  {
    alertEmailDeliveryRepository,
    emailDeliveryProvider,
    indicatorSnapshotRepository,
    marketDataProvider,
    priceSnapshotRepository,
    signalRepository,
    watchlistRepository,
  }: MarketDataDependencies,
): Promise<
  Result<{ latestMarketDate: string | null }, RefreshMarketDataError>
> {
  const item = await watchlistRepository.findByIdForProfile({
    itemId: command.itemId,
    profileId: command.profileId,
  });

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
  const recordedSignals = await signalRepository.upsertMany(buySignals);
  await deliverBuySignalAlerts(
    {
      emailAlertsEnabled: command.emailAlertsEnabled,
      recipientEmail: command.recipientEmail,
      signals: recordedSignals,
    },
    {
      alertEmailDeliveryRepository,
      emailDeliveryProvider,
    },
  );

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
