import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";

import {
  toWatchlistItemId,
  type WatchlistItem,
} from "../domain/watchlist-item";
import { TickerSymbolNavigation } from "./ticker-symbol-navigation";

describe("TickerSymbolNavigation", () => {
  it("links every profile symbol and identifies the current one", () => {
    render(
      <TickerSymbolNavigation
        currentSymbol="PETR4"
        items={[createItem("KNCR11"), createItem("PETR4")]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Ativos acompanhados" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver detalhes de KNCR11" }),
    ).toHaveAttribute("href", "/dashboard/tickers/KNCR11");
    expect(
      screen.getByRole("link", { name: "Ver detalhes de PETR4" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

function createItem(symbol: string): WatchlistItem {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    enabled: true,
    id: toWatchlistItemId(`item-${symbol}`),
    logoUrl: null,
    longName: symbol,
    notes: null,
    profileId: toProfileId("profile-1"),
    symbol,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
