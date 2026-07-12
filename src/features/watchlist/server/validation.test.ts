import { describe, expect, it } from "vitest";

import {
  normalizeTickerSymbol,
  parseCreateWatchlistForm,
  parseUpdateWatchlistForm,
} from "./validation";

describe("watchlist form validation", () => {
  it("normalizes lowercase symbols and removes whitespace", () => {
    expect(normalizeTickerSymbol("  pe tr4 ")).toBe("PETR4");
  });

  it("parses valid fields and converts empty optional fields to null", () => {
    const formData = new FormData();
    formData.set("symbol", " vale3 ");
    formData.set("notes", "");

    expect(parseCreateWatchlistForm(formData)).toEqual({
      notes: null,
      symbol: "VALE3",
    });

    expect(parseUpdateWatchlistForm(formData)).toEqual({ notes: null });
  });

  it("rejects invalid symbols", () => {
    const formData = new FormData();
    formData.set("symbol", "AB-1");

    expect(() => parseCreateWatchlistForm(formData)).toThrow();
  });

  it("enforces optional field length limits", () => {
    const longNotes = new FormData();
    longNotes.set("symbol", "PETR4");
    longNotes.set("notes", "x".repeat(1001));

    expect(() => parseCreateWatchlistForm(longNotes)).toThrow();
    expect(() => parseUpdateWatchlistForm(longNotes)).toThrow();
  });
});
