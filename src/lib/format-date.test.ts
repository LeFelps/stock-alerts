import { describe, expect, it } from "vitest";

import { formatHumanDate, formatHumanDateTime } from "./format-date";

describe("formatHumanDate", () => {
  const now = new Date(2026, 6, 11, 18, 30);

  it("uses relative labels for today and yesterday", () => {
    expect(formatHumanDate("2026-07-11", now)).toBe("Hoje");
    expect(formatHumanDate("2026-07-10", now)).toBe("Ontem");
  });

  it("uses a short Brazilian date for earlier dates", () => {
    expect(formatHumanDate("2026-07-09", now)).toBe("09/07/2026");
  });

  it("keeps the time when formatting a timestamp", () => {
    expect(formatHumanDateTime(new Date(2026, 6, 11, 14, 5), now)).toBe(
      "Hoje, 14:05",
    );
  });
});
