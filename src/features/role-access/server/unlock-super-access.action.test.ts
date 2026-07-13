import { beforeEach, describe, expect, it, vi } from "vitest";

import { unlockSuperAccess } from "./unlock-super-access.action";

const createDrizzleProfilesRepositoryMock = vi.hoisted(() => vi.fn());
const requireCurrentProfileMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const updateProfileRoleMock = vi.hoisted(() => vi.fn());
const verifyRolePasswordMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/profiles/application/update-profile-role", () => ({
  updateProfileRole: updateProfileRoleMock,
}));

vi.mock(
  "@/features/profiles/infrastructure/drizzle-profiles-repository",
  () => ({
    createDrizzleProfilesRepository: createDrizzleProfilesRepositoryMock,
  }),
);

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("./role-password", () => ({
  verifyRolePassword: verifyRolePasswordMock,
}));

describe("unlockSuperAccess", () => {
  beforeEach(() => {
    createDrizzleProfilesRepositoryMock.mockReset();
    createDrizzleProfilesRepositoryMock.mockReturnValue({
      type: "profiles-repository",
    });
    requireCurrentProfileMock.mockReset();
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: { id: "profile-1", role: "USER" },
    });
    revalidatePathMock.mockReset();
    updateProfileRoleMock.mockReset();
    updateProfileRoleMock.mockResolvedValue({
      ok: true,
      value: { id: "profile-1", role: "SUPER" },
    });
    verifyRolePasswordMock.mockReset();
    verifyRolePasswordMock.mockReturnValue({ status: "valid" });
  });

  it("persists SUPER for the authenticated profile", async () => {
    const formData = new FormData();
    formData.set("password", "role-password");

    await expect(unlockSuperAccess(formData)).resolves.toEqual({
      role: "SUPER",
      status: "success",
    });
    expect(updateProfileRoleMock).toHaveBeenCalledWith(
      { profileId: "profile-1", role: "SUPER" },
      { profilesRepository: { type: "profiles-repository" } },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("rejects malformed form data before checking the password", async () => {
    await expect(unlockSuperAccess(new FormData())).resolves.toEqual({
      error: "validation_error",
      status: "error",
    });
    expect(verifyRolePasswordMock).not.toHaveBeenCalled();
    expect(updateProfileRoleMock).not.toHaveBeenCalled();
  });

  it("does not update the profile when the password is incorrect", async () => {
    verifyRolePasswordMock.mockReturnValue({ status: "invalid_password" });
    const formData = new FormData();
    formData.set("password", "wrong-password");

    await expect(unlockSuperAccess(formData)).resolves.toEqual({
      error: "invalid_password",
      status: "error",
    });
    expect(updateProfileRoleMock).not.toHaveBeenCalled();
  });
});
