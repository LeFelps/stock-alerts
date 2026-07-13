import { describe, expect, it, vi } from "vitest";

import type { ProfilesRepository } from "./ports";
import { updateEmailAlertsPreferenceForProfile } from "./update-email-alerts-preference";
import {
  toAuthUserId,
  toProfileId,
  type Profile,
  type ProfileId,
} from "../domain/profile";

describe("updateEmailAlertsPreferenceForProfile", () => {
  it("updates the email alert preference for the profile", async () => {
    const profile = createProfile({ emailAlertsEnabled: false });
    const profilesRepository: ProfilesRepository = {
      createForAuthUser: vi.fn(),
      findByAuthUserId: vi.fn(),
      updateEmailAlertsPreference: vi.fn().mockResolvedValue(profile),
    };

    const result = await updateEmailAlertsPreferenceForProfile(
      { enabled: false, profileId: profile.id },
      { profilesRepository },
    );

    expect(result).toEqual({ ok: true, value: profile });
    expect(profilesRepository.updateEmailAlertsPreference).toHaveBeenCalledWith(
      {
        enabled: false,
        profileId: profile.id,
      },
    );
  });

  it("returns a typed failure when the profile is missing", async () => {
    const profileId = toProfileId("missing-profile");
    const profilesRepository: ProfilesRepository = {
      createForAuthUser: vi.fn(),
      findByAuthUserId: vi.fn(),
      updateEmailAlertsPreference: vi.fn().mockResolvedValue(null),
    };

    const result = await updateEmailAlertsPreferenceForProfile(
      { enabled: true, profileId },
      { profilesRepository },
    );

    expect(result).toEqual({
      error: { type: "profile_not_found" },
      ok: false,
    });
  });
});

function createProfile({
  emailAlertsEnabled,
}: {
  emailAlertsEnabled: boolean;
}): Profile {
  return {
    authUserId: toAuthUserId("user-1"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    emailAlertsEnabled,
    id: toProfileId("profile-1") as ProfileId,
    role: "USER",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
