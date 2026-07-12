"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";

import { updateEmailAlertsPreferenceForProfile } from "../application/update-email-alerts-preference";
import { createDrizzleProfilesRepository } from "../infrastructure/drizzle-profiles-repository";
import { requireCurrentProfile } from "./current-profile";

const updateEmailAlertsPreferenceSchema = z.object({
  emailAlertsEnabled: z.literal("true").optional(),
});

export async function updateEmailAlertsPreference(
  formData: FormData,
): Promise<ActionResult<{ emailAlertsEnabled: boolean }>> {
  const { profile } = await requireCurrentProfile();
  const parsedFields = updateEmailAlertsPreferenceSchema.safeParse({
    emailAlertsEnabled: formData.get("emailAlertsEnabled") ?? undefined,
  });

  if (!parsedFields.success) return actionError("validation_error");

  const fields = parsedFields.data;

  const result = await updateEmailAlertsPreferenceForProfile(
    {
      enabled: fields.emailAlertsEnabled === "true",
      profileId: profile.id,
    },
    { profilesRepository: createDrizzleProfilesRepository() },
  );

  if (!result.ok) {
    return actionError("not_found");
  }

  revalidatePath("/dashboard/preferences");
  return actionSuccess({
    emailAlertsEnabled: result.value.emailAlertsEnabled,
  });
}
