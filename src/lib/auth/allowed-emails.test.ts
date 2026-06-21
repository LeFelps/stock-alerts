import { describe, expect, it } from "vitest";

import { isEmailAllowed, parseAllowedEmails } from "./allowed-emails";

describe("parseAllowedEmails", () => {
  it("returns an empty set for unset or blank values", () => {
    expect(parseAllowedEmails()).toEqual(new Set());
    expect(parseAllowedEmails("   \n ")).toEqual(new Set());
  });

  it("parses comma and newline separated email addresses", () => {
    expect(
      parseAllowedEmails("one@example.com, TWO@example.com\nthree@example.com"),
    ).toEqual(
      new Set(["one@example.com", "two@example.com", "three@example.com"]),
    );
  });
});

describe("isEmailAllowed", () => {
  it("allows a valid email when ALLOWED_EMAILS is unset", () => {
    expect(isEmailAllowed("user@example.com", undefined)).toBe(true);
  });

  it("allows a valid email when ALLOWED_EMAILS is empty", () => {
    expect(isEmailAllowed("user@example.com", "  \n ")).toBe(true);
  });

  it("allows listed comma-separated emails", () => {
    expect(
      isEmailAllowed("user@example.com", "admin@example.com,user@example.com"),
    ).toBe(true);
  });

  it("allows listed newline-separated emails", () => {
    expect(
      isEmailAllowed("user@example.com", "admin@example.com\nuser@example.com"),
    ).toBe(true);
  });

  it("matches email addresses case-insensitively", () => {
    expect(isEmailAllowed("User@Example.com", "user@example.com")).toBe(true);
  });

  it("rejects non-listed emails", () => {
    expect(isEmailAllowed("other@example.com", "user@example.com")).toBe(false);
  });

  it("rejects missing emails", () => {
    expect(isEmailAllowed(null, undefined)).toBe(false);
    expect(isEmailAllowed("", undefined)).toBe(false);
  });
});
