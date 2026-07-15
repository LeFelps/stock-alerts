import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { watchlistItems } from "@/db/schema";

import type { AssetLogoRefreshRepository } from "../application/ports";

type Database = typeof db;

export function createDrizzleAssetLogoRefreshRepository(
  database: Database = db,
): AssetLogoRefreshRepository {
  const missingLogo = or(
    isNull(watchlistItems.logoUrl),
    sql`btrim(${watchlistItems.logoUrl}) = ''`,
    ilike(watchlistItems.logoUrl, "%/BRAPI.svg"),
  );

  return {
    async listMissingLogoSymbols() {
      const rows = await database
        .selectDistinct({ symbol: watchlistItems.symbol })
        .from(watchlistItems)
        .where(missingLogo)
        .orderBy(watchlistItems.symbol);

      return rows.map((row) => row.symbol);
    },

    async updateMissingLogo(command) {
      const rows = await database
        .update(watchlistItems)
        .set({
          logoUrl: command.logoUrl,
          longName: command.longName,
          updatedAt: new Date(),
        })
        .where(and(eq(watchlistItems.symbol, command.symbol), missingLogo))
        .returning({ id: watchlistItems.id });

      return rows.length;
    },
  };
}
