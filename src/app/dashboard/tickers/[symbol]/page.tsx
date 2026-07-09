import { notFound } from "next/navigation";
import { z } from "zod";

import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
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
  const watchlistItem = await createDrizzleWatchlistRepository().findBySymbol({
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
    <DashboardShell activeSection="overview" userEmail={currentProfile.email}>
      <section className="grid gap-6">
        <SectionHeader
          title="Detalhe do Ativo"
          description="Histórico de preços, médias móveis exponenciais e payloads brutos salvos para depuração."
        />
        <TickerDetail
          indicatorSnapshots={indicatorSnapshots}
          priceSnapshots={priceSnapshots}
          watchlistItem={watchlistItem}
        />
      </section>
    </DashboardShell>
  );
}
