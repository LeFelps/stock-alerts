import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    <section className="grid gap-8">
      <div className="grid gap-3">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </Link>
        <SectionHeader
          title={`Detalhes de ${symbol}`}
          description="Histórico de preços, médias móveis exponenciais e dados brutos salvos para depuração."
        />
      </div>
      <div className="grid gap-6">
        <TickerDetail
          indicatorSnapshots={indicatorSnapshots}
          priceSnapshots={priceSnapshots}
        />
      </div>
    </section>
  );
}
