import type { AuthUserId, Profile } from "../domain/profile";
import { ok, type Result } from "./result";
import type { ProfilesRepository } from "./ports";

export type EnsureProfileCommand = {
  authUserId: AuthUserId;
};

export async function ensureProfileForAuthUser(
  command: EnsureProfileCommand,
  deps: { profilesRepository: ProfilesRepository },
): Promise<Result<Profile, never>> {
  const existingProfile = await deps.profilesRepository.findByAuthUserId(
    command.authUserId,
  );

  if (existingProfile) {
    return ok(existingProfile);
  }

  return ok(
    await deps.profilesRepository.createForAuthUser({
      authUserId: command.authUserId,
    }),
  );
}
