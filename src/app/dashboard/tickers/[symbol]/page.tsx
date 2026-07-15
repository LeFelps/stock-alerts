import { notFound } from "next/navigation";
import { z } from "zod";

import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { createDrizzleIndicatorSnapshotRepository } from "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository";
import { createDrizzlePriceSnapshotRepository } from "@/features/market-data/infrastructure/drizzle-price-snapshot-repository";
import { TickerDetail } from "@/features/market-data/ui/ticker-detail";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";

const symbolSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4,12}$/)
  .transform((symbol) => symbol.toUpperCase());

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = await params;
  const parsedSymbol = symbolSchema.safeParse(rawSymbol);

  if (!parsedSymbol.success) {
    notFound();
  }

  const symbol = parsedSymbol.data;
  const currentProfile = await requireCurrentProfile();
  const watchlistRepository = createDrizzleWatchlistRepository();
  const watchlistItem = await watchlistRepository.findBySymbol({
    profileId: currentProfile.profile.id,
    symbol,
  });

  if (!watchlistItem) {
    notFound();
  }

  const [priceSnapshots, indicatorSnapshots] = await Promise.all([
    createDrizzlePriceSnapshotRepository().listForSymbol(symbol),
    createDrizzleIndicatorSnapshotRepository().listForSymbol(symbol),
  ]);

  return (
    <div className="grid gap-8">
      <SectionHeader
        title={`Detalhes de ${symbol}`}
        description="Histórico de preços, médias móveis exponenciais e dados brutos salvos para depuração."
      />
      <div className="grid gap-6">
        <TickerDetail
          indicatorSnapshots={indicatorSnapshots}
          priceSnapshots={priceSnapshots}
        />
      </div>
    </div>
  );
}
