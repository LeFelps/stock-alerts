import type { Profile, ProfileId } from "../domain/profile";
import { err, ok, type Result } from "./result";
import type { ProfilesRepository } from "./ports";

export type UpdateEmailAlertsPreferenceCommand = {
  enabled: boolean;
  profileId: ProfileId;
};

export type UpdateEmailAlertsPreferenceError = {
  type: "profile_not_found";
};

export async function updateEmailAlertsPreferenceForProfile(
  command: UpdateEmailAlertsPreferenceCommand,
  deps: { profilesRepository: ProfilesRepository },
): Promise<Result<Profile, UpdateEmailAlertsPreferenceError>> {
  const updatedProfile =
    await deps.profilesRepository.updateEmailAlertsPreference(command);

  if (!updatedProfile) {
    return err({ type: "profile_not_found" });
  }

  return ok(updatedProfile);
}
