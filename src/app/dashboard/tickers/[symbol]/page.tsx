import { ChevronRight } from "lucide-react";
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
    <>
      <nav aria-label="Trilha de navegação">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link className="hover:text-foreground" href="/dashboard">
              Dashboard
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight aria-hidden="true" className="size-4" />
            <span>Ativos</span>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight aria-hidden="true" className="size-4" />
            <span aria-current="page">{symbol}</span>
          </li>
        </ol>
      </nav>
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
    </>
  );
}
