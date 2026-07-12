import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listWatchlistItemsForProfile } from "@/features/watchlist/application/manage-watchlist";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { WatchlistManagement } from "@/features/watchlist/ui/watchlist-management";

export default async function SettingsPage() {
  const currentProfile = await requireCurrentProfile();
  const watchlistItems = await listWatchlistItemsForProfile(
    { profileId: currentProfile.profile.id },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );
  return (
    <section className="grid gap-6">
      <SectionHeader
        title="Configurações"
        description="Adicione e gerencie os Ativos da sua Lista de acompanhamento."
      />
      <WatchlistManagement
        key={watchlistItems
          .map((item) => `${item.id}:${item.updatedAt.toISOString()}`)
          .join("|")}
        items={watchlistItems}
      />
    </section>
  );
}
