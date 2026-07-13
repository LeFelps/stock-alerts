import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";

import { ensureProfileForAuthUser } from "../application/ensure-profile";
import type { Profile } from "../domain/profile";
import { toAuthUserId } from "../domain/profile";
import { createDrizzleProfilesRepository } from "../infrastructure/drizzle-profiles-repository";

export type CurrentProfile = {
  email: string;
  profile: Profile;
};

export const requireCurrentProfile = cache(
  async (): Promise<CurrentProfile> => {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      redirect("/");
    }

    const result = await ensureProfileForAuthUser(
      { authUserId: toAuthUserId(session.user.id) },
      { profilesRepository: createDrizzleProfilesRepository() },
    );

    if (!result.ok) {
      throw new Error("Failed to load current profile");
    }

    return {
      email: session.user.email,
      profile: result.value,
    };
  },
);

export async function requireSuperProfile(): Promise<CurrentProfile> {
  const currentProfile = await requireCurrentProfile();

  if (currentProfile.profile.role !== "SUPER") redirect("/dashboard");

  return currentProfile;
}
