import { describe, expect, it } from "vitest";

import { getActiveSection } from "./dashboard-navigation";

describe("getActiveSection", () => {
  it.each([
    ["/dashboard", "overview"],
    ["/dashboard/tickers/PETR4", "overview"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/preferences", "preferences"],
    ["/dashboard/signals", "signals"],
    ["/dashboard/jobs", "jobs"],
  ])("maps %s to %s", (pathname, section) => {
    expect(getActiveSection(pathname)).toBe(section);
  });
});
