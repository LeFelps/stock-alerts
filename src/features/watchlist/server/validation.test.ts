import { describe, expect, it } from "vitest";

import { normalizeTickerSymbol, parseWatchlistForm } from "./validation";

describe("watchlist form validation", () => {
  it("normalizes lowercase symbols and removes whitespace", () => {
    expect(normalizeTickerSymbol("  pe tr4 ")).toBe("PETR4");
  });

  it("parses valid fields and converts empty optional fields to null", () => {
    const formData = new FormData();
    formData.set("symbol", " vale3 ");
    formData.set("displayName", " ");
    formData.set("notes", "");

    expect(parseWatchlistForm(formData)).toEqual({
      displayName: null,
      notes: null,
      symbol: "VALE3",
    });
  });

  it("rejects invalid symbols", () => {
    const formData = new FormData();
    formData.set("symbol", "AB-1");

    expect(() => parseWatchlistForm(formData)).toThrow();
  });

  it("enforces optional field length limits", () => {
    const longDisplayName = new FormData();
    longDisplayName.set("symbol", "PETR4");
    longDisplayName.set("displayName", "x".repeat(121));

    const longNotes = new FormData();
    longNotes.set("symbol", "PETR4");
    longNotes.set("notes", "x".repeat(1001));

    expect(() => parseWatchlistForm(longDisplayName)).toThrow();
    expect(() => parseWatchlistForm(longNotes)).toThrow();
  });
});
