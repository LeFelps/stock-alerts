import { EMA_COLORS } from "@/features/indicators/ui/ema-colors";

import type { BuySignalReason, SignalType } from "../domain/signal";

export type SignalTriggerSegment = {
  color: string;
  label: "MME6" | "MME13" | "MME42";
};

export function formatSignalType(signalType: SignalType) {
  return signalType === "BUY" ? "Compra técnica" : signalType;
}

export function getSignalTriggerSegments(
  reason: BuySignalReason,
): SignalTriggerSegment[] {
  switch (reason) {
    case "EMA6_CROSSED_ABOVE_EMA42":
      return [
        { color: EMA_COLORS.ema6, label: "MME6" },
        { color: EMA_COLORS.ema42, label: "MME42" },
      ];
    case "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42":
      return [
        { color: EMA_COLORS.ema6, label: "MME6" },
        { color: EMA_COLORS.ema13, label: "MME13" },
        { color: EMA_COLORS.ema42, label: "MME42" },
      ];
  }
}

export function formatSignalTrigger(reason: BuySignalReason) {
  return getSignalTriggerSegments(reason)
    .map((segment) => segment.label)
    .join(" > ");
}
