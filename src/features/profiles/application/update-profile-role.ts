import type { Profile, ProfileId, ProfileRole } from "../domain/profile";
import { err, ok, type Result } from "./result";
import type { ProfileRoleRepository } from "./ports";

export type UpdateProfileRoleCommand = {
  profileId: ProfileId;
  role: ProfileRole;
};

export type UpdateProfileRoleError = {
  type: "profile_not_found";
};

export async function updateProfileRole(
  command: UpdateProfileRoleCommand,
  deps: { profilesRepository: ProfileRoleRepository },
): Promise<Result<Profile, UpdateProfileRoleError>> {
  const updatedProfile = await deps.profilesRepository.updateRole(command);

  if (!updatedProfile) return err({ type: "profile_not_found" });

  return ok(updatedProfile);
}
