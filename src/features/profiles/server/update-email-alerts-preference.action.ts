"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { updateEmailAlertsPreferenceForProfile } from "../application/update-email-alerts-preference";
import { createDrizzleProfilesRepository } from "../infrastructure/drizzle-profiles-repository";
import { requireCurrentProfile } from "./current-profile";

const updateEmailAlertsPreferenceSchema = z.object({
  emailAlertsEnabled: z.literal("true").optional(),
});

export async function updateEmailAlertsPreference(formData: FormData) {
  const { profile } = await requireCurrentProfile();
  const fields = updateEmailAlertsPreferenceSchema.parse({
    emailAlertsEnabled: formData.get("emailAlertsEnabled") ?? undefined,
  });

  const result = await updateEmailAlertsPreferenceForProfile(
    {
      enabled: fields.emailAlertsEnabled === "true",
      profileId: profile.id,
    },
    { profilesRepository: createDrizzleProfilesRepository() },
  );

  if (!result.ok) {
    notFound();
  }

  revalidatePath("/dashboard/preferences");
}
