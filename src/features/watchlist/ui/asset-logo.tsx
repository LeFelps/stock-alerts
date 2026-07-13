"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { WatchlistItem } from "../domain/watchlist-item";

export function AssetLogo({
  item,
}: {
  item: Pick<WatchlistItem, "logoUrl" | "symbol">;
}) {
  if (!item.logoUrl) {
    return <AssetLogoFallback symbol={item.symbol} />;
  }

  return (
    <AssetLogoImage
      key={item.logoUrl}
      logoUrl={item.logoUrl}
      symbol={item.symbol}
    />
  );
}

function AssetLogoImage({
  logoUrl,
  symbol,
}: {
  logoUrl: string;
  symbol: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <AssetLogoFallback symbol={symbol} />;

  return (
    <Image
      alt={`Logo de ${symbol}`}
      className="size-8 shrink-0 rounded-md object-contain"
      height={32}
      onError={() => setFailed(true)}
      src={logoUrl}
      unoptimized
      width={32}
    />
  );
}

function AssetLogoFallback({ symbol }: { symbol: string }) {
  return (
    <span
      aria-label={`Logo indisponível para ${symbol}`}
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      role="img"
    >
      <ImageOff aria-hidden="true" className="size-4" />
    </span>
  );
}
