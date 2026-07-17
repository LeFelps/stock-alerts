import { describe, expect, it } from "vitest";

import {
  eligibleMarketDateForAlertCheck,
  marketDataFetchThroughDateForAlertCheck,
} from "./eligible-market-date";

describe("eligibleMarketDateForAlertCheck", () => {
  it("uses Monday for a Tuesday morning run in São Paulo", () => {
    expect(
      eligibleMarketDateForAlertCheck(new Date("2026-07-14T11:00:00.000Z")),
    ).toBe("2026-07-13");
  });

  it("uses Friday for a Saturday morning run in São Paulo", () => {
    expect(
      eligibleMarketDateForAlertCheck(new Date("2026-07-18T11:00:00.000Z")),
    ).toBe("2026-07-17");
  });

  it("uses the São Paulo date near a UTC day boundary", () => {
    expect(
      eligibleMarketDateForAlertCheck(new Date("2026-07-15T01:30:00.000Z")),
    ).toBe("2026-07-13");
  });
});

describe("marketDataFetchThroughDateForAlertCheck", () => {
  it("uses the current São Paulo date near a UTC day boundary", () => {
    expect(
      marketDataFetchThroughDateForAlertCheck(
        new Date("2026-07-15T01:30:00.000Z"),
      ),
    ).toBe("2026-07-14");
  });
});
