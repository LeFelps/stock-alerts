import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { listLatestMarketDataDatesForSymbols } from "@/features/market-data/application/refresh-market-data";
import { createDrizzlePriceSnapshotRepository } from "@/features/market-data/infrastructure/drizzle-price-snapshot-repository";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listWatchlistItemsForProfile } from "@/features/watchlist/application/manage-watchlist";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { WatchlistManagement } from "@/features/watchlist/ui/watchlist-management";

export default async function DashboardPage() {
  const currentProfile = await requireCurrentProfile();
  const watchlistRepository = createDrizzleWatchlistRepository();
  const watchlistItems = await listWatchlistItemsForProfile(
    { profileId: currentProfile.profile.id },
    { watchlistRepository },
  );
  const latestMarketDates = await listLatestMarketDataDatesForSymbols(
    { symbols: watchlistItems.map((item) => item.symbol) },
    { priceSnapshotRepository: createDrizzlePriceSnapshotRepository() },
  );
  const watchlistItemsWithMarketData = watchlistItems.map((item) => ({
    ...item,
    latestMarketDate: latestMarketDates.get(item.symbol) ?? null,
  }));

  return (
    <DashboardShell activeSection="overview" userEmail={currentProfile.email}>
      <section className="rounded-lg bg-muted/55 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            title="Painel protegido"
            description="Espaço autenticado para acompanhar ativos e preparar regras de alerta."
          />
          <Badge variant="secondary" className="w-fit">
            Sessão ativa
          </Badge>
        </div>
      </section>

      <section className="grid gap-6">
        <SectionHeader
          title="Lista de acompanhamento"
          description="Adicione e organize os Ativos que você deseja monitorar."
        />
        <WatchlistManagement items={watchlistItemsWithMarketData} />
      </section>
    </DashboardShell>
  );
}
