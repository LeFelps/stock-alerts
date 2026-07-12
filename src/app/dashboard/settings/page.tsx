import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listLatestMarketDataDatesForSymbols } from "@/features/market-data/application/refresh-market-data";
import { createDrizzlePriceSnapshotRepository } from "@/features/market-data/infrastructure/drizzle-price-snapshot-repository";
import { listWatchlistItemsForProfile } from "@/features/watchlist/application/manage-watchlist";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { WatchlistManagement } from "@/features/watchlist/ui/watchlist-management";
import { formatCalendarDateInTimeZone } from "@/lib/format-date";

export default async function SettingsPage() {
  const currentProfile = await requireCurrentProfile();
  const watchlistItems = await listWatchlistItemsForProfile(
    { profileId: currentProfile.profile.id },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );
  const latestMarketDates = await listLatestMarketDataDatesForSymbols(
    { symbols: watchlistItems.map((item) => item.symbol) },
    { priceSnapshotRepository: createDrizzlePriceSnapshotRepository() },
  );

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="Configurações"
        description="Adicione e gerencie os Ativos da sua Lista de acompanhamento."
      />
      <WatchlistManagement
        key={watchlistItems
          .map(
            (item) =>
              `${item.id}:${item.updatedAt.toISOString()}:${latestMarketDates.get(item.symbol) ?? "no-market-data"}`,
          )
          .join("|")}
        items={watchlistItems.map((item) => ({
          ...item,
          latestMarketDate: latestMarketDates.get(item.symbol) ?? null,
        }))}
        referenceDate={formatCalendarDateInTimeZone(
          new Date(),
          "America/Sao_Paulo",
        )}
      />
    </section>
  );
}
