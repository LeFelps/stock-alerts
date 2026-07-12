import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";

export type TechnicalOutlook = {
  signal: "BULLISH" | "BEARISH" | "MIXED" | "UNAVAILABLE";
  suggestion: "BUY" | "HOLD" | "SELL";
};

export function getTechnicalOutlook(
  snapshot: IndicatorSnapshot | null,
): TechnicalOutlook {
  if (
    snapshot?.ema6 == null ||
    snapshot.ema13 == null ||
    snapshot.ema42 == null
  ) {
    return { signal: "UNAVAILABLE", suggestion: "HOLD" };
  }

  if (snapshot.ema6 > snapshot.ema13 && snapshot.ema13 > snapshot.ema42) {
    return { signal: "BULLISH", suggestion: "BUY" };
  }

  if (snapshot.ema6 < snapshot.ema13 && snapshot.ema13 < snapshot.ema42) {
    return { signal: "BEARISH", suggestion: "SELL" };
  }

  return { signal: "MIXED", suggestion: "HOLD" };
}
