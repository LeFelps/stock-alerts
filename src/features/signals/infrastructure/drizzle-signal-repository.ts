import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { signals } from "@/db/schema";

import type { SignalRepository } from "../application/ports";
import { toSignalId, type Signal } from "../domain/signal";

type Database = typeof db;
type SignalRow = typeof signals.$inferSelect;

export function createDrizzleSignalRepository(
  database: Database = db,
): SignalRepository {
  return {
    async listForProfile(profileId) {
      const rows = await database
        .select()
        .from(signals)
        .where(eq(signals.profileId, profileId))
        .orderBy(desc(signals.marketDate), desc(signals.createdAt));

      return rows.map(toSignal);
    },

    async upsertMany(newSignals) {
      if (newSignals.length === 0) {
        return [];
      }

      const rows = await database
        .insert(signals)
        .values(newSignals)
        .onConflictDoNothing({
          target: [
            signals.profileId,
            signals.symbol,
            signals.signalType,
            signals.marketDate,
          ],
        })
        .returning();

      return rows.map(toSignal);
    },
  };
}

function toSignal(signal: SignalRow): Signal {
  return {
    createdAt: signal.createdAt,
    id: toSignalId(signal.id),
    marketDate: signal.marketDate,
    profileId: signal.profileId as Signal["profileId"],
    reason: signal.reason as Signal["reason"],
    signalType: signal.signalType as Signal["signalType"],
    symbol: signal.symbol,
  };
}
