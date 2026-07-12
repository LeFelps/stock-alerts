import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { createDrizzleIndicatorSnapshotRepository } from "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository";
import { MarketOverview } from "@/features/market-data/ui/market-overview";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listWatchlistItemsForProfile } from "@/features/watchlist/application/manage-watchlist";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";

export default async function DashboardPage() {
  const currentProfile = await requireCurrentProfile();
  const watchlistRepository = createDrizzleWatchlistRepository();
  const watchlistItems = await listWatchlistItemsForProfile(
    { profileId: currentProfile.profile.id },
    { watchlistRepository },
  );
  const symbols = watchlistItems.map((item) => item.symbol);
  const latestIndicators =
    await createDrizzleIndicatorSnapshotRepository().latestBySymbol(symbols);

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="Monitoramento"
        description="Resumo dos Ativos acompanhados com preços, médias móveis exponenciais e estado atual."
      />
      <MarketOverview
        items={watchlistItems.map((item) => ({
          latestIndicator: latestIndicators.get(item.symbol) ?? null,
          watchlistItem: item,
        }))}
      />
    </section>
  );
}
