"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createWatchlistItemForProfile,
  deleteWatchlistItemForProfile,
  setWatchlistItemEnabledForProfile,
  updateWatchlistItemForProfile,
} from "../application/manage-watchlist";
import { toWatchlistItemId } from "../domain/watchlist-item";
import { createBrapiAssetCatalogProvider } from "../infrastructure/brapi-asset-catalog-provider";
import { createDrizzleWatchlistRepository } from "../infrastructure/drizzle-watchlist-repository";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import type { WatchlistItem } from "../domain/watchlist-item";
import {
  parseCreateWatchlistForm,
  parseUpdateWatchlistForm,
} from "./validation";

const itemIdSchema = z.string().min(1);

export async function createWatchlistItem(
  formData: FormData,
): Promise<ActionResult<WatchlistItem>> {
  const { profile } = await requireCurrentProfile();
  const fields = safeParseForm(() => parseCreateWatchlistForm(formData));

  if (!fields) return actionError("validation_error");

  const result = await createWatchlistItemForProfile(
    { ...fields, profileId: profile.id },
    {
      assetCatalogProvider: createBrapiAssetCatalogProvider(),
      watchlistRepository: createDrizzleWatchlistRepository(),
    },
  );

  if (!result.ok) {
    return mutationError(result.error.type);
  }

  revalidateWatchlistRoutes(result.value.symbol);
  return actionSuccess(result.value);
}

export async function updateWatchlistItem(
  itemId: string,
  formData: FormData,
): Promise<ActionResult<WatchlistItem>> {
  const { profile } = await requireCurrentProfile();
  const fields = safeParseForm(() => parseUpdateWatchlistForm(formData));
  const parsedItemId = itemIdSchema.safeParse(itemId);

  if (!fields || !parsedItemId.success) {
    return actionError("validation_error");
  }

  const repository = createDrizzleWatchlistRepository();
  const previous = await repository.findByIdForProfile({
    itemId: toWatchlistItemId(parsedItemId.data),
    profileId: profile.id,
  });

  const result = await updateWatchlistItemForProfile(
    {
      ...fields,
      itemId: toWatchlistItemId(parsedItemId.data),
      profileId: profile.id,
    },
    { watchlistRepository: repository },
  );

  if (!result.ok) return mutationError(result.error.type);

  revalidateWatchlistRoutes(previous?.symbol, result.value.symbol);
  return actionSuccess(result.value);
}

export async function setWatchlistItemEnabled(
  itemId: string,
  enabled: boolean,
): Promise<ActionResult<WatchlistItem>> {
  const { profile } = await requireCurrentProfile();
  const parsedItemId = itemIdSchema.safeParse(itemId);
  const parsedEnabled = z.boolean().safeParse(enabled);

  if (!parsedItemId.success || !parsedEnabled.success) {
    return actionError("validation_error");
  }

  const result = await setWatchlistItemEnabledForProfile(
    {
      enabled: parsedEnabled.data,
      itemId: toWatchlistItemId(parsedItemId.data),
      profileId: profile.id,
    },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );

  if (!result.ok) return mutationError(result.error.type);

  revalidateWatchlistRoutes(result.value.symbol);
  return actionSuccess(result.value);
}

export async function deleteWatchlistItem(
  itemId: string,
): Promise<ActionResult> {
  const { profile } = await requireCurrentProfile();
  const parsedItemId = itemIdSchema.safeParse(itemId);

  if (!parsedItemId.success) return actionError("validation_error");

  const repository = createDrizzleWatchlistRepository();
  const existing = await repository.findByIdForProfile({
    itemId: toWatchlistItemId(parsedItemId.data),
    profileId: profile.id,
  });
  const result = await deleteWatchlistItemForProfile(
    {
      itemId: toWatchlistItemId(parsedItemId.data),
      profileId: profile.id,
    },
    { watchlistRepository: repository },
  );

  if (!result.ok) return mutationError(result.error.type);

  revalidateWatchlistRoutes(existing?.symbol);
  return actionSuccess(undefined);
}

function revalidateWatchlistRoutes(...symbols: Array<string | undefined>) {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  for (const symbol of new Set(symbols.filter(Boolean))) {
    revalidatePath(`/dashboard/tickers/${symbol}`);
  }
}

function safeParseForm<T>(parse: () => T): T | null {
  try {
    return parse();
  } catch (error) {
    if (error instanceof z.ZodError) return null;
    throw error;
  }
}

function mutationError<T>(
  type:
    | "duplicate_symbol"
    | "invalid_symbol"
    | "provider_error"
    | "watchlist_item_not_found",
): ActionResult<T> {
  if (type === "duplicate_symbol") return actionError<T>("duplicate_symbol");
  if (type === "invalid_symbol") return actionError<T>("invalid_symbol");
  if (type === "provider_error") return actionError<T>("provider_error");
  return actionError<T>("not_found");
}
