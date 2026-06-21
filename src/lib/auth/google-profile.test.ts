import { describe, expect, it } from "vitest";

import { isGoogleProfileAllowed } from "./google-profile";

describe("isGoogleProfileAllowed", () => {
  it("allows any Google profile with an email when no email restriction is configured", () => {
    expect(
      isGoogleProfileAllowed(
        { email: "user@example.com", email_verified: false },
        undefined,
      ),
    ).toBe(true);
  });

  it("allows listed emails when Google marks the email as verified", () => {
    expect(
      isGoogleProfileAllowed(
        { email: "user@example.com", email_verified: true },
        "user@example.com",
      ),
    ).toBe(true);
  });

  it("rejects listed emails when Google does not mark the email as verified", () => {
    expect(
      isGoogleProfileAllowed(
        { email: "user@example.com", email_verified: false },
        "user@example.com",
      ),
    ).toBe(false);
  });

  it("rejects listed emails when Google omits the email verification flag", () => {
    expect(
      isGoogleProfileAllowed({ email: "user@example.com" }, "user@example.com"),
    ).toBe(false);
  });
});
