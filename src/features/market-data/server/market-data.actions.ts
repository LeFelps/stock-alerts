"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { createDrizzleIndicatorSnapshotRepository } from "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { toWatchlistItemId } from "@/features/watchlist/domain/watchlist-item";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";

import { refreshMarketDataForWatchlistItem } from "../application/refresh-market-data";
import { createConfiguredMarketDataProvider } from "../infrastructure/market-data-provider-factory";
import { createDrizzlePriceSnapshotRepository } from "../infrastructure/drizzle-price-snapshot-repository";

const itemIdSchema = z.string().min(1);
const revalidatePathSchema = z
  .string()
  .regex(/^\/dashboard\/tickers\/[A-Z0-9]{4,12}$/);

export async function refreshWatchlistItemMarketData(
  itemId: string,
  formData?: FormData,
) {
  const { profile } = await requireCurrentProfile();
  const result = await refreshMarketDataForWatchlistItem(
    {
      itemId: toWatchlistItemId(itemIdSchema.parse(itemId)),
      profileId: profile.id,
    },
    {
      indicatorSnapshotRepository: createDrizzleIndicatorSnapshotRepository(),
      marketDataProvider: createConfiguredMarketDataProvider(),
      priceSnapshotRepository: createDrizzlePriceSnapshotRepository(),
      watchlistRepository: createDrizzleWatchlistRepository(),
    },
  );

  if (!result.ok) {
    notFound();
  }

  revalidatePath("/dashboard");

  const requestedPath = formData?.get("revalidatePath");
  const parsedPath = revalidatePathSchema.safeParse(requestedPath);

  if (parsedPath.success) {
    revalidatePath(parsedPath.data);
  }
}
