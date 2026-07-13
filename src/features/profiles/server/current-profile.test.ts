import { beforeEach, describe, expect, it, vi } from "vitest";

import { toAuthUserId, toProfileId, type Profile } from "../domain/profile";
import { requireSuperProfile } from "./current-profile";

const authMock = vi.hoisted(() => vi.fn());
const createDrizzleProfilesRepositoryMock = vi.hoisted(() => vi.fn());
const ensureProfileForAuthUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T extends (...args: never[]) => unknown>(callback: T) => callback,
}));

vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("../application/ensure-profile", () => ({
  ensureProfileForAuthUser: ensureProfileForAuthUserMock,
}));

vi.mock("../infrastructure/drizzle-profiles-repository", () => ({
  createDrizzleProfilesRepository: createDrizzleProfilesRepositoryMock,
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("requireSuperProfile", () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    createDrizzleProfilesRepositoryMock.mockReset();
    createDrizzleProfilesRepositoryMock.mockReturnValue({
      type: "profiles-repository",
    });
    ensureProfileForAuthUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the current SUPER profile", async () => {
    const profile = createProfile("SUPER");
    ensureProfileForAuthUserMock.mockResolvedValue({
      ok: true,
      value: profile,
    });

    await expect(requireSuperProfile()).resolves.toEqual({
      email: "user@example.com",
      profile,
    });
  });

  it("redirects a regular profile", async () => {
    ensureProfileForAuthUserMock.mockResolvedValue({
      ok: true,
      value: createProfile("USER"),
    });

    await expect(requireSuperProfile()).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
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
