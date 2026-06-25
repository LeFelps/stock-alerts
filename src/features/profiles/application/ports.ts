import type { AuthUserId, Profile, ProfileId } from "../domain/profile";

export type CreateProfileCommand = {
  authUserId: AuthUserId;
};

export type ProfilesRepository = {
  createForAuthUser(command: CreateProfileCommand): Promise<Profile>;
  findByAuthUserId(authUserId: AuthUserId): Promise<Profile | null>;
  updateEmailAlertsPreference(command: {
    enabled: boolean;
    profileId: ProfileId;
  }): Promise<Profile | null>;
};
