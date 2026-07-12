import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listSignalsForProfile } from "@/features/signals/application/manage-signals";
import { createDrizzleSignalRepository } from "@/features/signals/infrastructure/drizzle-signal-repository";
import { SignalsHistory } from "@/features/signals/ui/signals-history";
import { listWatchlistItemsForProfile } from "@/features/watchlist/application/manage-watchlist";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";

export default async function SignalsPage() {
  const currentProfile = await requireCurrentProfile();
  const [signals, watchlistItems] = await Promise.all([
    listSignalsForProfile(
      { profileId: currentProfile.profile.id },
      { signalRepository: createDrizzleSignalRepository() },
    ),
    listWatchlistItemsForProfile(
      { profileId: currentProfile.profile.id },
      { watchlistRepository: createDrizzleWatchlistRepository() },
    ),
  ]);
  const assetsBySymbol = new Map(
    watchlistItems.map((item) => [
      item.symbol,
      { logoUrl: item.logoUrl, symbol: item.symbol },
    ]),
  );

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="Sinais"
        description="Histórico de sinais técnicos gerados a partir das médias móveis salvas para o Perfil."
      />
      <SignalsHistory
        items={signals.map((signal) => ({
          asset: assetsBySymbol.get(signal.symbol) ?? {
            logoUrl: null,
            symbol: signal.symbol,
          },
          signal,
        }))}
      />
    </section>
  );
}
