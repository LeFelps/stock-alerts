import { describe, expect, it, vi } from "vitest";

import type { ProfilesRepository } from "./ports";
import { ensureProfileForAuthUser } from "./ensure-profile";
import { toAuthUserId, toProfileId, type Profile } from "../domain/profile";

describe("ensureProfileForAuthUser", () => {
  it("returns an existing profile for the Auth.js user", async () => {
    const existingProfile = createProfile();
    const profilesRepository: ProfilesRepository = {
      createForAuthUser: vi.fn(),
      findByAuthUserId: vi.fn().mockResolvedValue(existingProfile),
      updateEmailAlertsPreference: vi.fn(),
    };

    const result = await ensureProfileForAuthUser(
      { authUserId: existingProfile.authUserId },
      { profilesRepository },
    );

    expect(result).toEqual({ ok: true, value: existingProfile });
    expect(profilesRepository.createForAuthUser).not.toHaveBeenCalled();
  });

  it("creates a profile when the Auth.js user has none", async () => {
    const createdProfile = createProfile();
    const profilesRepository: ProfilesRepository = {
      createForAuthUser: vi.fn().mockResolvedValue(createdProfile),
      findByAuthUserId: vi.fn().mockResolvedValue(null),
      updateEmailAlertsPreference: vi.fn(),
    };

    const result = await ensureProfileForAuthUser(
      { authUserId: createdProfile.authUserId },
      { profilesRepository },
    );

    expect(result).toEqual({ ok: true, value: createdProfile });
    expect(profilesRepository.createForAuthUser).toHaveBeenCalledWith({
      authUserId: createdProfile.authUserId,
    });
  });
});

function createProfile(): Profile {
  return {
    authUserId: toAuthUserId("user-1"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    emailAlertsEnabled: true,
    id: toProfileId("profile-1"),
    role: "USER",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
