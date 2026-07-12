import Image from "next/image";

import type { WatchlistItem } from "../domain/watchlist-item";

export function AssetLogo({
  item,
}: {
  item: Pick<WatchlistItem, "logoUrl" | "symbol">;
}) {
  if (!item.logoUrl) {
    return (
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground"
      >
        {item.symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      alt=""
      className="size-8 shrink-0 rounded-md object-contain"
      height={32}
      src={item.logoUrl}
      unoptimized
      width={32}
    />
  );
}
