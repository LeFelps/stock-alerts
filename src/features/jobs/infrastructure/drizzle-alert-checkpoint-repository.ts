import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { alertCheckpoints } from "@/db/schema";

import type { AlertCheckCheckpointRepository } from "../application/ports";

type Database = typeof db;

export function createDrizzleAlertCheckCheckpointRepository(
  database: Database = db,
): AlertCheckCheckpointRepository {
  return {
    async latestProcessedMarketDate({ profileId, symbol }) {
      const [checkpoint] = await database
        .select({ marketDate: alertCheckpoints.lastProcessedMarketDate })
        .from(alertCheckpoints)
        .where(
          and(
            eq(alertCheckpoints.profileId, profileId),
            eq(alertCheckpoints.symbol, symbol),
          ),
        )
        .limit(1);

      return checkpoint?.marketDate ?? null;
    },

    async markProcessed({ marketDate, profileId, symbol }) {
      await database
        .insert(alertCheckpoints)
        .values({ lastProcessedMarketDate: marketDate, profileId, symbol })
        .onConflictDoUpdate({
          set: {
            lastProcessedMarketDate: sql`greatest(${alertCheckpoints.lastProcessedMarketDate}, ${marketDate})`,
            updatedAt: new Date(),
          },
          target: [alertCheckpoints.profileId, alertCheckpoints.symbol],
        });
    },
  };
}
