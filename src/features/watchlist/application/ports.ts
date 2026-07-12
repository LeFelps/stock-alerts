import type { ProfileId } from "@/features/profiles/domain/profile";

import type { WatchlistItem, WatchlistItemId } from "../domain/watchlist-item";

export type ResolvedAsset = {
  longName: string;
  logoUrl: string | null;
  symbol: string;
};

export type AssetResolution =
  | { asset: ResolvedAsset; status: "resolved" }
  | { status: "invalid" }
  | { status: "unavailable" };

export type AssetCatalogProvider = {
  resolveSymbol(symbol: string): Promise<AssetResolution>;
};

export type CreateWatchlistItemFields = Pick<
  WatchlistItem,
  "notes" | "symbol"
> &
  Pick<ResolvedAsset, "logoUrl" | "longName">;

export type UpdateWatchlistItemFields = Pick<WatchlistItem, "notes">;

export type WatchlistRepository = {
  create(
    command: CreateWatchlistItemFields & { profileId: ProfileId },
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
    command: UpdateWatchlistItemFields & {
      itemId: WatchlistItemId;
      profileId: ProfileId;
    },
  ): Promise<WatchlistItem | null>;
};
