import { describe, expect, it } from "vitest";

import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import { toProfileId } from "@/features/profiles/domain/profile";

import { detectBuySignalsForProfile } from "./detect-buy-signals";

describe("BUY signal detector", () => {
  it("detects BUY when MME6 crosses above MME42", () => {
    const signals = detectBuySignalsForProfile({
      indicatorSnapshots: [
        createIndicator({
          ema6: 9,
          ema13: null,
          ema42: 10,
          marketDate: "2026-01-01",
        }),
        createIndicator({
          ema6: 11,
          ema13: null,
          ema42: 10,
          marketDate: "2026-01-02",
        }),
      ],
      profileId: toProfileId("profile-1"),
    });

    expect(signals).toEqual([
      {
        marketDate: "2026-01-02",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "PETR4",
      },
    ]);
  });

  it("detects BUY when MME6 crosses above MME13 while already above MME42", () => {
    const signals = detectBuySignalsForProfile({
      indicatorSnapshots: [
        createIndicator({
          ema6: 13,
          ema13: 14,
          ema42: 10,
          marketDate: "2026-01-01",
        }),
        createIndicator({
          ema6: 15,
          ema13: 14,
          ema42: 10,
          marketDate: "2026-01-02",
        }),
      ],
      profileId: toProfileId("profile-1"),
    });

    expect(signals).toEqual([
      {
        marketDate: "2026-01-02",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "PETR4",
      },
    ]);
  });

  it("emits each distinct BUY reason when both technical rules trigger", () => {
    const signals = detectBuySignalsForProfile({
      indicatorSnapshots: [
        createIndicator({
          ema6: 9,
          ema13: 10,
          ema42: 10,
          marketDate: "2026-01-01",
        }),
        createIndicator({
          ema6: 12,
          ema13: 11,
          ema42: 11,
          marketDate: "2026-01-02",
        }),
      ],
      profileId: toProfileId("profile-1"),
    });

    expect(signals).toEqual([
      {
        marketDate: "2026-01-02",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "PETR4",
      },
      {
        marketDate: "2026-01-02",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "PETR4",
      },
    ]);
  });

  it("does not detect BUY when required current or previous MME values are missing", () => {
    const signals = detectBuySignalsForProfile({
      indicatorSnapshots: [
        createIndicator({
          ema6: null,
          ema13: 14,
          ema42: 10,
          marketDate: "2026-01-01",
        }),
        createIndicator({
          ema6: 15,
          ema13: null,
          ema42: 10,
          marketDate: "2026-01-02",
        }),
      ],
      profileId: toProfileId("profile-1"),
    });

    expect(signals).toEqual([]);
  });

  it("sorts indicator rows before detecting crossings", () => {
    const signals = detectBuySignalsForProfile({
      indicatorSnapshots: [
        createIndicator({
          ema6: 11,
          ema13: null,
          ema42: 10,
          marketDate: "2026-01-02",
        }),
        createIndicator({
          ema6: 9,
          ema13: null,
          ema42: 10,
          marketDate: "2026-01-01",
        }),
      ],
      profileId: toProfileId("profile-1"),
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]?.marketDate).toBe("2026-01-02");
  });
});

function createIndicator(
  overrides: Partial<IndicatorSnapshot>,
): IndicatorSnapshot {
  return {
    close: 10,
    ema6: 10,
    ema13: 10,
    ema42: 10,
    marketDate: "2026-01-01",
    source: "brapi",
    symbol: "PETR4",
    ...overrides,
  };
}
