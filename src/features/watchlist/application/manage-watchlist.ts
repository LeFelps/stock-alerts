import type { ProfileId } from "@/features/profiles/domain/profile";

import type { WatchlistItem, WatchlistItemId } from "../domain/watchlist-item";
import type {
  AssetCatalogProvider,
  UpdateWatchlistItemFields,
  WatchlistRepository,
} from "./ports";
import { err, ok, type Result } from "./result";

type WatchlistDependencies = {
  watchlistRepository: WatchlistRepository;
};

type WatchlistMutationError =
  | { type: "duplicate_symbol" }
  | { type: "invalid_symbol" }
  | { type: "provider_error" }
  | { type: "watchlist_item_not_found" };

export async function listWatchlistItemsForProfile(
  command: { profileId: ProfileId },
  { watchlistRepository }: WatchlistDependencies,
) {
  return watchlistRepository.listForProfile(command.profileId);
}

export async function createWatchlistItemForProfile(
  command: { notes: string | null; profileId: ProfileId; symbol: string },
  {
    assetCatalogProvider,
    watchlistRepository,
  }: WatchlistDependencies & { assetCatalogProvider: AssetCatalogProvider },
): Promise<Result<WatchlistItem, WatchlistMutationError>> {
  const resolution = await assetCatalogProvider.resolveSymbol(command.symbol);

  if (resolution.status === "invalid") {
    return err({ type: "invalid_symbol" });
  }

  if (resolution.status === "unavailable") {
    return err({ type: "provider_error" });
  }

  const { logoUrl, longName, symbol } = resolution.asset;
  const duplicate = await watchlistRepository.findBySymbol({
    profileId: command.profileId,
    symbol,
  });

  if (duplicate) {
    return err({ type: "duplicate_symbol" } as const);
  }

  const createdItem = await watchlistRepository.create({
    notes: command.notes,
    profileId: command.profileId,
    logoUrl,
    longName,
    symbol,
  });

  return createdItem ? ok(createdItem) : err({ type: "duplicate_symbol" });
}

export async function updateWatchlistItemForProfile(
  command: UpdateWatchlistItemFields & {
    itemId: WatchlistItemId;
    profileId: ProfileId;
  },
  { watchlistRepository }: WatchlistDependencies,
): Promise<Result<WatchlistItem, WatchlistMutationError>> {
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
