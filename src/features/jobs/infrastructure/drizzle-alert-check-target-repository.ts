import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, users, watchlistItems } from "@/db/schema";
import type { ProfileId } from "@/features/profiles/domain/profile";

import type { AlertCheckTargetRepository } from "../application/ports";

type Database = typeof db;

export function createDrizzleAlertCheckTargetRepository(
  database: Database = db,
): AlertCheckTargetRepository {
  return {
    async listEnabledTargets() {
      const rows = await database
        .select({
          emailAlertsEnabled: profiles.emailAlertsEnabled,
          profileId: profiles.id,
          recipientEmail: users.email,
          symbol: watchlistItems.symbol,
        })
        .from(watchlistItems)
        .innerJoin(profiles, eq(watchlistItems.profileId, profiles.id))
        .innerJoin(users, eq(profiles.userId, users.id))
        .where(eq(watchlistItems.enabled, true))
        .orderBy(asc(watchlistItems.symbol), asc(profiles.id));

      return rows.map((row) => ({
        emailAlertsEnabled: row.emailAlertsEnabled,
        profileId: row.profileId as ProfileId,
        recipientEmail: row.recipientEmail,
        symbol: row.symbol,
      }));
    },
  };
}
