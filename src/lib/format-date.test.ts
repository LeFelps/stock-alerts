import { describe, expect, it } from "vitest";

import {
  formatCalendarDateInTimeZone,
  formatHumanDate,
  formatHumanDateTime,
} from "./format-date";

describe("formatHumanDate", () => {
  const now = new Date(2026, 6, 11, 18, 30);

  it("uses relative labels for today and yesterday", () => {
    expect(formatHumanDate("2026-07-11", now)).toBe("Hoje");
    expect(formatHumanDate("2026-07-10", now)).toBe("Ontem");
  });

  it("accepts a stable calendar date as the relative-date reference", () => {
    expect(formatHumanDate("2026-07-11", "2026-07-11")).toBe("Hoje");
    expect(formatHumanDate("2026-07-10", "2026-07-11")).toBe("Ontem");
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

describe("formatCalendarDateInTimeZone", () => {
  it("returns the São Paulo calendar date around UTC midnight", () => {
    expect(
      formatCalendarDateInTimeZone(
        new Date("2026-07-12T01:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("2026-07-11");
  });
});
