import { describe, expect, it } from "vitest";

import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";

import { getTechnicalOutlook } from "./technical-outlook";

describe("technical outlook", () => {
  it("suggests buying when the moving averages are aligned upward", () => {
    expect(
      getTechnicalOutlook(createSnapshot({ ema6: 12, ema13: 11, ema42: 10 })),
    ).toEqual({ signal: "BULLISH", suggestion: "BUY" });
  });

  it("suggests selling when the moving averages are aligned downward", () => {
    expect(
      getTechnicalOutlook(createSnapshot({ ema6: 10, ema13: 11, ema42: 12 })),
    ).toEqual({ signal: "BEARISH", suggestion: "SELL" });
  });

  it("suggests holding when the moving averages are mixed", () => {
    expect(
      getTechnicalOutlook(createSnapshot({ ema6: 12, ema13: 10, ema42: 11 })),
    ).toEqual({ signal: "MIXED", suggestion: "HOLD" });
  });

  it("suggests holding when a moving average is unavailable", () => {
    expect(
      getTechnicalOutlook(createSnapshot({ ema6: 12, ema13: 11, ema42: null })),
    ).toEqual({ signal: "UNAVAILABLE", suggestion: "HOLD" });
  });
});

function createSnapshot(
  values: Pick<IndicatorSnapshot, "ema6" | "ema13" | "ema42">,
): IndicatorSnapshot {
  return {
    close: 12,
    marketDate: "2026-07-12",
    source: "brapi",
    symbol: "PETR4",
    ...values,
  };
}
