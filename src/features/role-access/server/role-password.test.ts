import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyRolePassword } from "./role-password";

vi.mock("server-only", () => ({}));

describe("verifyRolePassword", () => {
  const originalRoleAccessPassword = process.env.ROLE_ACCESS_PASSWORD;

  beforeEach(() => {
    process.env.ROLE_ACCESS_PASSWORD = "role-password";
  });

  afterEach(() => {
    if (originalRoleAccessPassword === undefined) {
      delete process.env.ROLE_ACCESS_PASSWORD;
    } else {
      process.env.ROLE_ACCESS_PASSWORD = originalRoleAccessPassword;
    }
  });

  it("accepts the configured password", () => {
    expect(verifyRolePassword("role-password")).toEqual({ status: "valid" });
  });

  it("rejects an incorrect password", () => {
    expect(verifyRolePassword("wrong-password")).toEqual({
      status: "invalid_password",
    });
  });

  it("keeps access closed when the password is not configured", () => {
    delete process.env.ROLE_ACCESS_PASSWORD;

    expect(verifyRolePassword("role-password")).toEqual({
      status: "not_configured",
    });
  });
});
