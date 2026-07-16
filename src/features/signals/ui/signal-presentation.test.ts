import { describe, expect, it } from "vitest";

import {
  formatSignalTrigger,
  formatSignalType,
  getSignalTriggerSegments,
} from "./signal-presentation";

describe("signal presentation", () => {
  it("uses the same technical-buy label across product surfaces", () => {
    expect(formatSignalType("BUY")).toBe("Compra técnica");
  });

  it.each([
    ["EMA6_CROSSED_ABOVE_EMA42", "MME6 > MME42"],
    ["EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42", "MME6 > MME13 > MME42"],
  ] as const)("formats %s as %s", (reason, expected) => {
    expect(formatSignalTrigger(reason)).toBe(expected);
  });

  it("preserves the indicator colors used by the Signals page", () => {
    expect(
      getSignalTriggerSegments("EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42"),
    ).toEqual([
      { color: "#2563eb", label: "MME6" },
      { color: "#c026d3", label: "MME13" },
      { color: "#ea580c", label: "MME42" },
    ]);
  });
});
