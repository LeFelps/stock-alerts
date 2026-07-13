import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { priceSnapshots } from "@/db/schema";

import type { PriceSnapshotRepository } from "../application/ports";
import type { PriceSnapshot } from "../domain/price-snapshot";

type Database = typeof db;

export function createDrizzlePriceSnapshotRepository(
  database: Database = db,
): PriceSnapshotRepository {
  return {
    async listForSymbol(symbol) {
      const rows = await database
        .select()
        .from(priceSnapshots)
        .where(eq(priceSnapshots.symbol, symbol))
        .orderBy(desc(priceSnapshots.marketDate));

      return rows.map(toPriceSnapshot).reverse();
    },

    async upsertMany(snapshots) {
      if (snapshots.length === 0) {
        return;
      }

      await database
        .insert(priceSnapshots)
        .values(snapshots.map(toInsertRow))
        .onConflictDoUpdate({
          set: {
            adjustedClose: sql.raw(`excluded.adjusted_close`),
            close: sql.raw(`excluded.close`),
            currency: sql.raw(`excluded.currency`),
            fetchedAt: sql.raw(`excluded.fetched_at`),
            high: sql.raw(`excluded.high`),
            low: sql.raw(`excluded.low`),
            open: sql.raw(`excluded.open`),
            rawPayload: sql.raw(`excluded.raw_payload`),
            updatedAt: new Date(),
            volume: sql.raw(`excluded.volume`),
          },
          target: [
            priceSnapshots.symbol,
            priceSnapshots.marketDate,
            priceSnapshots.source,
          ],
        });
    },
  };
}

function toPriceSnapshot(
  snapshot: typeof priceSnapshots.$inferSelect,
): PriceSnapshot {
  return {
    adjustedClose: snapshot.adjustedClose,
    close: snapshot.close,
    currency: snapshot.currency,
    fetchedAt: snapshot.fetchedAt,
    high: snapshot.high,
    low: snapshot.low,
    marketDate: snapshot.marketDate,
    open: snapshot.open,
    rawPayload: snapshot.rawPayload,
    source: snapshot.source as PriceSnapshot["source"],
    symbol: snapshot.symbol,
    volume: snapshot.volume,
  };
}

function toInsertRow(snapshot: PriceSnapshot) {
  return {
    adjustedClose: snapshot.adjustedClose,
    close: snapshot.close,
    currency: snapshot.currency,
    fetchedAt: snapshot.fetchedAt,
    high: snapshot.high,
    low: snapshot.low,
    marketDate: snapshot.marketDate,
    open: snapshot.open,
    rawPayload: snapshot.rawPayload,
    source: snapshot.source,
    symbol: snapshot.symbol,
    volume: snapshot.volume,
  };
}
