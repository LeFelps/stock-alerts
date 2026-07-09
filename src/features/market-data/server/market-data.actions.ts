"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { toWatchlistItemId } from "@/features/watchlist/domain/watchlist-item";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";

import { refreshMarketDataForWatchlistItem } from "../application/refresh-market-data";
import { createBrapiMarketDataProvider } from "../infrastructure/brapi-market-data-provider";
import { createDrizzlePriceSnapshotRepository } from "../infrastructure/drizzle-price-snapshot-repository";

const itemIdSchema = z.string().min(1);

export async function refreshWatchlistItemMarketData(itemId: string) {
  const { profile } = await requireCurrentProfile();
  const result = await refreshMarketDataForWatchlistItem(
    {
      itemId: toWatchlistItemId(itemIdSchema.parse(itemId)),
      profileId: profile.id,
    },
    {
      marketDataProvider: createBrapiMarketDataProvider(),
      priceSnapshotRepository: createDrizzlePriceSnapshotRepository(),
      watchlistRepository: createDrizzleWatchlistRepository(),
    },
  );

  if (!result.ok) {
    notFound();
  }

  revalidatePath("/dashboard");
}
