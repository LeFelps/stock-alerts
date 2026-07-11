"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  createWatchlistItemForProfile,
  deleteWatchlistItemForProfile,
  setWatchlistItemEnabledForProfile,
  updateWatchlistItemForProfile,
} from "../application/manage-watchlist";
import { toWatchlistItemId } from "../domain/watchlist-item";
import { createDrizzleWatchlistRepository } from "../infrastructure/drizzle-watchlist-repository";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { parseWatchlistForm } from "./validation";

const itemIdSchema = z.string().min(1);

export async function createWatchlistItem(formData: FormData) {
  const { profile } = await requireCurrentProfile();
  const fields = parseWatchlistForm(formData);
  const result = await createWatchlistItemForProfile(
    { ...fields, profileId: profile.id },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );

  if (!result.ok) {
    return;
  }

  revalidatePath("/dashboard/settings");
}

export async function updateWatchlistItem(itemId: string, formData: FormData) {
  const { profile } = await requireCurrentProfile();
  const fields = parseWatchlistForm(formData);
  const result = await updateWatchlistItemForProfile(
    {
      ...fields,
      itemId: toWatchlistItemId(itemIdSchema.parse(itemId)),
      profileId: profile.id,
    },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );

  handleMutationResult(result);
}

export async function setWatchlistItemEnabled(
  itemId: string,
  enabled: boolean,
) {
  const { profile } = await requireCurrentProfile();
  const result = await setWatchlistItemEnabledForProfile(
    {
      enabled: z.boolean().parse(enabled),
      itemId: toWatchlistItemId(itemIdSchema.parse(itemId)),
      profileId: profile.id,
    },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );

  handleMutationResult(result);
}

export async function deleteWatchlistItem(itemId: string) {
  const { profile } = await requireCurrentProfile();
  const result = await deleteWatchlistItemForProfile(
    {
      itemId: toWatchlistItemId(itemIdSchema.parse(itemId)),
      profileId: profile.id,
    },
    { watchlistRepository: createDrizzleWatchlistRepository() },
  );

  handleMutationResult(result);
}

function handleMutationResult(result: {
  error?: { type: "duplicate_symbol" | "watchlist_item_not_found" };
  ok: boolean;
}) {
  if (!result.ok) {
    if (result.error?.type === "watchlist_item_not_found") {
      notFound();
    }

    return;
  }

  revalidatePath("/dashboard/settings");
}
