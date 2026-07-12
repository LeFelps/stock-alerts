import type { ProfileId } from "@/features/profiles/domain/profile";

import type { WatchlistItem, WatchlistItemId } from "../domain/watchlist-item";
import type { WatchlistItemFields, WatchlistRepository } from "./ports";
import { err, ok, type Result } from "./result";

type WatchlistDependencies = {
  watchlistRepository: WatchlistRepository;
};

type WatchlistMutationError =
  | { type: "duplicate_symbol" }
  | { type: "watchlist_item_not_found" };

export async function listWatchlistItemsForProfile(
  command: { profileId: ProfileId },
  { watchlistRepository }: WatchlistDependencies,
) {
  return watchlistRepository.listForProfile(command.profileId);
}

export async function createWatchlistItemForProfile(
  command: WatchlistItemFields & { profileId: ProfileId },
  { watchlistRepository }: WatchlistDependencies,
) {
  const duplicate = await watchlistRepository.findBySymbol({
    profileId: command.profileId,
    symbol: command.symbol,
  });

  if (duplicate) {
    return err({ type: "duplicate_symbol" } as const);
  }

  const createdItem = await watchlistRepository.create(command);

  return createdItem ? ok(createdItem) : err({ type: "duplicate_symbol" });
}

export async function updateWatchlistItemForProfile(
  command: WatchlistItemFields & {
    itemId: WatchlistItemId;
    profileId: ProfileId;
  },
  { watchlistRepository }: WatchlistDependencies,
): Promise<Result<WatchlistItem, WatchlistMutationError>> {
  const duplicate = await watchlistRepository.findBySymbol({
    excludeItemId: command.itemId,
    profileId: command.profileId,
    symbol: command.symbol,
  });

  if (duplicate) {
    return err({ type: "duplicate_symbol" });
  }

  const updatedItem = await watchlistRepository.update(command);

  return updatedItem
    ? ok(updatedItem)
    : err({ type: "watchlist_item_not_found" });
}

export async function setWatchlistItemEnabledForProfile(
  command: {
    enabled: boolean;
    itemId: WatchlistItemId;
    profileId: ProfileId;
  },
  { watchlistRepository }: WatchlistDependencies,
): Promise<Result<WatchlistItem, WatchlistMutationError>> {
  const updatedItem = await watchlistRepository.setEnabled(command);

  return updatedItem
    ? ok(updatedItem)
    : err({ type: "watchlist_item_not_found" });
}

export async function deleteWatchlistItemForProfile(
  command: { itemId: WatchlistItemId; profileId: ProfileId },
  { watchlistRepository }: WatchlistDependencies,
): Promise<Result<undefined, WatchlistMutationError>> {
  const deleted = await watchlistRepository.delete(command);

  return deleted ? ok(undefined) : err({ type: "watchlist_item_not_found" });
}
