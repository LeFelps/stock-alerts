import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { indicatorSnapshots } from "@/db/schema";

import type { IndicatorSnapshotRepository } from "../application/ports";

type Database = typeof db;

export function createDrizzleIndicatorSnapshotRepository(
  database: Database = db,
): IndicatorSnapshotRepository {
  return {
    async latestBySymbol(symbols) {
      if (symbols.length === 0) {
        return new Map();
      }

      const rows = await database
        .select()
        .from(indicatorSnapshots)
        .where(inArray(indicatorSnapshots.symbol, symbols))
        .orderBy(
          asc(indicatorSnapshots.symbol),
          desc(indicatorSnapshots.marketDate),
        );

      return rows.reduce((latestSnapshots, row) => {
        if (!latestSnapshots.has(row.symbol)) {
          latestSnapshots.set(row.symbol, row);
        }

        return latestSnapshots;
      }, new Map());
    },

    async listForSymbol(symbol) {
      return database
        .select()
        .from(indicatorSnapshots)
        .where(eq(indicatorSnapshots.symbol, symbol))
        .orderBy(asc(indicatorSnapshots.marketDate));
    },

    async upsertMany(snapshots) {
      if (snapshots.length === 0) {
        return;
      }

      await database
        .insert(indicatorSnapshots)
        .values(snapshots)
        .onConflictDoUpdate({
          set: {
            close: sql.raw(`excluded.close`),
            ema6: sql.raw(`excluded.ema6`),
            ema13: sql.raw(`excluded.ema13`),
            ema42: sql.raw(`excluded.ema42`),
            source: sql.raw(`excluded.source`),
            updatedAt: new Date(),
          },
          target: [indicatorSnapshots.symbol, indicatorSnapshots.marketDate],
        });
    },
  };
}
