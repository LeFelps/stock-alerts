import { beforeEach, describe, expect, it, vi } from "vitest";

import { toAuthUserId, toProfileId } from "../domain/profile";
import { updateEmailAlertsPreference } from "./update-email-alerts-preference.action";

const requireCurrentProfileMock = vi.hoisted(() => vi.fn());
const updateEmailAlertsPreferenceForProfileMock = vi.hoisted(() => vi.fn());
const createDrizzleProfilesRepositoryMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("./current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock("../application/update-email-alerts-preference", () => ({
  updateEmailAlertsPreferenceForProfile:
    updateEmailAlertsPreferenceForProfileMock,
}));

vi.mock("../infrastructure/drizzle-profiles-repository", () => ({
  createDrizzleProfilesRepository: createDrizzleProfilesRepositoryMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

describe("updateEmailAlertsPreference", () => {
  beforeEach(() => {
    createDrizzleProfilesRepositoryMock.mockReset();
    createDrizzleProfilesRepositoryMock.mockReturnValue({
      type: "profiles-repository",
    });
    notFoundMock.mockClear();
    requireCurrentProfileMock.mockReset();
    revalidatePathMock.mockClear();
    updateEmailAlertsPreferenceForProfileMock.mockReset();
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: {
        authUserId: toAuthUserId("user-1"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        emailAlertsEnabled: true,
        id: toProfileId("profile-1"),
        role: "USER",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    updateEmailAlertsPreferenceForProfileMock.mockResolvedValue({
      ok: true,
      value: { emailAlertsEnabled: true },
    });
  });

  it("enables email alerts for the current profile", async () => {
    const formData = new FormData();
    formData.set("emailAlertsEnabled", "true");

    await updateEmailAlertsPreference(formData);

    expect(updateEmailAlertsPreferenceForProfileMock).toHaveBeenCalledWith(
      { enabled: true, profileId: toProfileId("profile-1") },
      { profilesRepository: { type: "profiles-repository" } },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/preferences");
  });

  it("disables email alerts when the checkbox is omitted", async () => {
    await updateEmailAlertsPreference(new FormData());

    expect(updateEmailAlertsPreferenceForProfileMock).toHaveBeenCalledWith(
      { enabled: false, profileId: toProfileId("profile-1") },
      { profilesRepository: { type: "profiles-repository" } },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/preferences");
  });

  it("returns not found when the profile update target is missing", async () => {
    updateEmailAlertsPreferenceForProfileMock.mockResolvedValue({
      error: { type: "profile_not_found" },
      ok: false,
    });

    await expect(updateEmailAlertsPreference(new FormData())).resolves.toEqual({
      error: "not_found",
      status: "error",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
