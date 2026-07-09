import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import type { ProfileId } from "@/features/profiles/domain/profile";

import type { BuySignalReason, NewSignal } from "../domain/signal";

export function detectBuySignalsForProfile(command: {
  indicatorSnapshots: IndicatorSnapshot[];
  profileId: ProfileId;
}): NewSignal[] {
  const sortedSnapshots = [...command.indicatorSnapshots].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
  const detectedSignals: NewSignal[] = [];

  for (let index = 1; index < sortedSnapshots.length; index += 1) {
    const previous = sortedSnapshots[index - 1];
    const current = sortedSnapshots[index];

    if (!previous || !current) {
      continue;
    }

    const reasons = detectBuyReasons(previous, current);

    detectedSignals.push(
      ...reasons.map((reason) => ({
        marketDate: current.marketDate,
        profileId: command.profileId,
        reason,
        signalType: "BUY" as const,
        symbol: current.symbol,
      })),
    );
  }

  return detectedSignals;
}

function detectBuyReasons(
  previous: IndicatorSnapshot,
  current: IndicatorSnapshot,
): BuySignalReason[] {
  const reasons: BuySignalReason[] = [];
  const previousEma6 = previous.ema6;
  const previousEma13 = previous.ema13;
  const previousEma42 = previous.ema42;
  const currentEma6 = current.ema6;
  const currentEma13 = current.ema13;
  const currentEma42 = current.ema42;

  if (
    previousEma6 != null &&
    previousEma42 != null &&
    currentEma6 != null &&
    currentEma42 != null &&
    previousEma6 <= previousEma42 &&
    currentEma6 > currentEma42
  ) {
    reasons.push("EMA6_CROSSED_ABOVE_EMA42");
  }

  if (
    previousEma6 != null &&
    previousEma13 != null &&
    currentEma6 != null &&
    currentEma13 != null &&
    currentEma42 != null &&
    previousEma6 <= previousEma13 &&
    currentEma6 > currentEma13 &&
    currentEma6 > currentEma42
  ) {
    reasons.push("EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42");
  }

  return reasons;
}
