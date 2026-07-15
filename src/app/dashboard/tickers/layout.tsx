import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { TickerSymbolNavigation } from "@/features/watchlist/ui/ticker-symbol-navigation";

export default async function TickersLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireCurrentProfile();
  const items = await createDrizzleWatchlistRepository().listForProfile(
    profile.id,
  );

  return (
    <section className="grid gap-3">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        href="/dashboard"
        prefetch
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>
      <TickerSymbolNavigation items={items} />
      {children}
    </section>
  );
}
