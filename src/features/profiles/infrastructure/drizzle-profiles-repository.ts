import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";

import type { ProfilesRepository } from "../application/ports";
import { toAuthUserId, toProfileId, type Profile } from "../domain/profile";

type Database = typeof db;
type ProfileRow = typeof profiles.$inferSelect;

export function createDrizzleProfilesRepository(
  database: Database = db,
): ProfilesRepository {
  async function findByAuthUserId(
    authUserId: Parameters<ProfilesRepository["findByAuthUserId"]>[0],
  ) {
    const [profile] = await database
      .select()
      .from(profiles)
      .where(eq(profiles.userId, authUserId))
      .limit(1);

    return profile ? toProfile(profile) : null;
  }

  return {
    async createForAuthUser(command) {
      const [createdProfile] = await database
        .insert(profiles)
        .values({ userId: command.authUserId })
        .onConflictDoNothing({ target: profiles.userId })
        .returning();

      if (createdProfile) {
        return toProfile(createdProfile);
      }

      const existingProfile = await findByAuthUserId(command.authUserId);

      if (!existingProfile) {
        throw new Error("Failed to create profile for authenticated user");
      }

      return existingProfile;
    },

    findByAuthUserId,

    async updateEmailAlertsPreference(command) {
      const [updatedProfile] = await database
        .update(profiles)
        .set({
          emailAlertsEnabled: command.enabled,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, command.profileId))
        .returning();

      return updatedProfile ? toProfile(updatedProfile) : null;
    },
  };
}

function toProfile(profile: ProfileRow): Profile {
  return {
    authUserId: toAuthUserId(profile.userId),
    createdAt: profile.createdAt,
    emailAlertsEnabled: profile.emailAlertsEnabled,
    id: toProfileId(profile.id),
    updatedAt: profile.updatedAt,
  };
}
