import type { ProfileId } from "@/features/profiles/domain/profile";
import type { Brand } from "@/lib/brand";

export type WatchlistItemId = Brand<string, "WatchlistItemId">;

export type WatchlistItem = {
  id: WatchlistItemId;
  profileId: ProfileId;
  symbol: string;
  displayName: string | null;
  notes: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toWatchlistItemId(value: string): WatchlistItemId {
  return value as WatchlistItemId;
}
