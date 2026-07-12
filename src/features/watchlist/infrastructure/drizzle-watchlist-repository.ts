import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { watchlistItems } from "@/db/schema";

import type { WatchlistRepository } from "../application/ports";
import {
  toWatchlistItemId,
  type WatchlistItem,
} from "../domain/watchlist-item";

type Database = typeof db;
type WatchlistItemRow = typeof watchlistItems.$inferSelect;

export function createDrizzleWatchlistRepository(
  database: Database = db,
): WatchlistRepository {
  return {
    async create(command) {
      const [createdItem] = await database
        .insert(watchlistItems)
        .values(command)
        .onConflictDoNothing({
          target: [watchlistItems.profileId, watchlistItems.symbol],
        })
        .returning();

      return createdItem ? toWatchlistItem(createdItem) : null;
    },

    async delete(command) {
      const deletedItems = await database
        .delete(watchlistItems)
        .where(
          and(
            eq(watchlistItems.id, command.itemId),
            eq(watchlistItems.profileId, command.profileId),
          ),
        )
        .returning({ id: watchlistItems.id });

      return deletedItems.length > 0;
    },

    async findBySymbol(command) {
      const ownershipAndSymbol = and(
        eq(watchlistItems.profileId, command.profileId),
        eq(watchlistItems.symbol, command.symbol),
      );
      const [item] = await database
        .select()
        .from(watchlistItems)
        .where(
          command.excludeItemId
            ? and(
                ownershipAndSymbol,
                ne(watchlistItems.id, command.excludeItemId),
              )
            : ownershipAndSymbol,
        )
        .limit(1);

      return item ? toWatchlistItem(item) : null;
    },

    async findByIdForProfile(command) {
      const [item] = await database
        .select()
        .from(watchlistItems)
        .where(
          and(
            eq(watchlistItems.id, command.itemId),
            eq(watchlistItems.profileId, command.profileId),
          ),
        )
        .limit(1);

      return item ? toWatchlistItem(item) : null;
    },

    async listForProfile(profileId) {
      const items = await database
        .select()
        .from(watchlistItems)
        .where(eq(watchlistItems.profileId, profileId))
        .orderBy(asc(watchlistItems.symbol));

      return items.map(toWatchlistItem);
    },

    async setEnabled(command) {
      const [updatedItem] = await database
        .update(watchlistItems)
        .set({ enabled: command.enabled, updatedAt: new Date() })
        .where(
          and(
            eq(watchlistItems.id, command.itemId),
            eq(watchlistItems.profileId, command.profileId),
          ),
        )
        .returning();

      return updatedItem ? toWatchlistItem(updatedItem) : null;
    },

    async update(command) {
      const [updatedItem] = await database
        .update(watchlistItems)
        .set({
          notes: command.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(watchlistItems.id, command.itemId),
            eq(watchlistItems.profileId, command.profileId),
          ),
        )
        .returning();

      return updatedItem ? toWatchlistItem(updatedItem) : null;
    },
  };
}

function toWatchlistItem(item: WatchlistItemRow): WatchlistItem {
  return {
    ...item,
    id: toWatchlistItemId(item.id),
    profileId: item.profileId as WatchlistItem["profileId"],
  };
}
