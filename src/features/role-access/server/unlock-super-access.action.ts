"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateProfileRole } from "@/features/profiles/application/update-profile-role";
import { createDrizzleProfilesRepository } from "@/features/profiles/infrastructure/drizzle-profiles-repository";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";

import { verifyRolePassword } from "./role-password";

export type UnlockSuperAccessResult =
  | { role: "SUPER"; status: "success" }
  | {
      error:
        | "invalid_password"
        | "not_configured"
        | "profile_not_found"
        | "validation_error";
      status: "error";
    };

const unlockSuperAccessSchema = z.object({
  password: z.string().min(1).max(256),
});

export async function unlockSuperAccess(
  formData: FormData,
): Promise<UnlockSuperAccessResult> {
  const currentProfile = await requireCurrentProfile();
  const parsedFields = unlockSuperAccessSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsedFields.success) {
    return { error: "validation_error", status: "error" };
  }

  const passwordResult = verifyRolePassword(parsedFields.data.password);
  if (passwordResult.status !== "valid") {
    return { error: passwordResult.status, status: "error" };
  }

  const result = await updateProfileRole(
    { profileId: currentProfile.profile.id, role: "SUPER" },
    { profilesRepository: createDrizzleProfilesRepository() },
  );

  if (!result.ok) {
    return { error: "profile_not_found", status: "error" };
  }

  revalidatePath("/dashboard", "layout");
  return { role: "SUPER", status: "success" };
}
