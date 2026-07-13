import { describe, expect, it, vi } from "vitest";

import { toAuthUserId, toProfileId, type Profile } from "../domain/profile";
import type { ProfileRoleRepository } from "./ports";
import { updateProfileRole } from "./update-profile-role";

describe("updateProfileRole", () => {
  it("persists the new role for the profile", async () => {
    const superProfile = createProfile("SUPER");
    const profilesRepository: ProfileRoleRepository = {
      updateRole: vi.fn().mockResolvedValue(superProfile),
    };

    const result = await updateProfileRole(
      { profileId: superProfile.id, role: "SUPER" },
      { profilesRepository },
    );

    expect(result).toEqual({ ok: true, value: superProfile });
    expect(profilesRepository.updateRole).toHaveBeenCalledWith({
      profileId: superProfile.id,
      role: "SUPER",
    });
  });

  it("returns a typed failure when the profile is missing", async () => {
    const profilesRepository: ProfileRoleRepository = {
      updateRole: vi.fn().mockResolvedValue(null),
    };

    await expect(
      updateProfileRole(
        { profileId: toProfileId("missing-profile"), role: "SUPER" },
        { profilesRepository },
      ),
    ).resolves.toEqual({
      error: { type: "profile_not_found" },
      ok: false,
    });
  });
});

function createProfile(role: Profile["role"]): Profile {
  return {
    authUserId: toAuthUserId("user-1"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    emailAlertsEnabled: true,
    id: toProfileId("profile-1"),
    role,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
