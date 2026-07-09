import type { ProfileId } from "@/features/profiles/domain/profile";

import type { WatchlistItem, WatchlistItemId } from "../domain/watchlist-item";

export type WatchlistItemFields = Pick<
  WatchlistItem,
  "displayName" | "notes" | "symbol"
>;

export type WatchlistRepository = {
  create(
    command: WatchlistItemFields & { profileId: ProfileId },
  ): Promise<WatchlistItem | null>;
  delete(command: {
    itemId: WatchlistItemId;
    profileId: ProfileId;
  }): Promise<boolean>;
  findBySymbol(command: {
    excludeItemId?: WatchlistItemId;
    profileId: ProfileId;
    symbol: string;
  }): Promise<WatchlistItem | null>;
  findByIdForProfile(command: {
    itemId: WatchlistItemId;
    profileId: ProfileId;
  }): Promise<WatchlistItem | null>;
  listForProfile(profileId: ProfileId): Promise<WatchlistItem[]>;
  setEnabled(command: {
    enabled: boolean;
    itemId: WatchlistItemId;
    profileId: ProfileId;
  }): Promise<WatchlistItem | null>;
  update(
    command: WatchlistItemFields & {
      itemId: WatchlistItemId;
      profileId: ProfileId;
    },
  ): Promise<WatchlistItem | null>;
};
