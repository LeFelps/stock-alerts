"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { WatchlistItem } from "../domain/watchlist-item";
import { AssetLogo } from "./asset-logo";

export function TickerSymbolNavigation({
  items,
}: {
  items: Array<Pick<WatchlistItem, "id" | "logoUrl" | "symbol">>;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Ativos acompanhados" className="min-w-0">
      <ul className="flex gap-2 overflow-x-auto pb-2">
        {items.map((item) => {
          const current = pathname === `/dashboard/tickers/${item.symbol}`;

          return (
            <li key={item.id}>
              <Link
                aria-current={current ? "page" : undefined}
                aria-label={`Ver detalhes de ${item.symbol}`}
                className={cn(
                  buttonVariants({
                    variant: current ? "secondary" : "ghost",
                  }),
                  "h-auto min-w-16 flex-col gap-1.5 px-2 py-2",
                )}
                href={`/dashboard/tickers/${item.symbol}`}
                prefetch
              >
                <span className="mt-1">
                  <AssetLogo item={item} />
                </span>
                <span className="text-xs">{item.symbol}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
