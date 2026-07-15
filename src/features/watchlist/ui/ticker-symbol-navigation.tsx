import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { WatchlistItem } from "../domain/watchlist-item";
import { AssetLogo } from "./asset-logo";

export function TickerSymbolNavigation({
  currentSymbol,
  items,
}: {
  currentSymbol: string;
  items: WatchlistItem[];
}) {
  return (
    <nav aria-label="Ativos acompanhados" className="min-w-0">
      <ul className="flex gap-2 overflow-x-auto pb-2">
        {items.map((item) => {
          const current = item.symbol === currentSymbol;

          return (
            <li key={item.id}>
              <Link
                aria-current={current ? "page" : undefined}
                aria-label={`Ver detalhes de ${item.symbol}`}
                className={cn(
                  buttonVariants({
                    variant: current ? "secondary" : "ghost",
                  }),
                  "h-auto min-w-16 flex-col gap-1 px-2 py-2",
                )}
                href={`/dashboard/tickers/${item.symbol}`}
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
