"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createDrizzleAlertEmailDeliveryRepository } from "@/features/alerts/infrastructure/drizzle-alert-email-delivery-repository";
import { createConfiguredEmailDeliveryProvider } from "@/features/alerts/infrastructure/email-delivery-provider-factory";
import { createDrizzleIndicatorSnapshotRepository } from "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository";
import { createDrizzleSignalRepository } from "@/features/signals/infrastructure/drizzle-signal-repository";
import { createDrizzleWatchlistRepository } from "@/features/watchlist/infrastructure/drizzle-watchlist-repository";
import { toWatchlistItemId } from "@/features/watchlist/domain/watchlist-item";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";

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
): Promise<ActionResult> {
  const { email, profile } = await requireCurrentProfile();
  const parsedItemId = itemIdSchema.safeParse(itemId);

  if (!parsedItemId.success) return actionError("validation_error");

  const result = await refreshMarketDataForWatchlistItem(
    {
      emailAlertsEnabled: profile.emailAlertsEnabled,
      itemId: toWatchlistItemId(parsedItemId.data),
      profileId: profile.id,
      recipientEmail: email,
    },
    {
      alertEmailDeliveryRepository: createDrizzleAlertEmailDeliveryRepository(),
      emailDeliveryProvider: createConfiguredEmailDeliveryProvider(),
      indicatorSnapshotRepository: createDrizzleIndicatorSnapshotRepository(),
      marketDataProvider: createConfiguredMarketDataProvider(),
      priceSnapshotRepository: createDrizzlePriceSnapshotRepository(),
      signalRepository: createDrizzleSignalRepository(),
      watchlistRepository: createDrizzleWatchlistRepository(),
    },
  );

  if (!result.ok) {
    return actionError("not_found");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/signals");

  const requestedPath = formData?.get("revalidatePath");
  const parsedPath = revalidatePathSchema.safeParse(requestedPath);

  if (parsedPath.success) {
    revalidatePath(parsedPath.data);
  }

  return actionSuccess(undefined);
}
