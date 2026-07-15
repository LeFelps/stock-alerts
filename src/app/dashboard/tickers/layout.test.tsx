import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toWatchlistItemId } from "@/features/watchlist/domain/watchlist-item";

import TickersLayout from "./layout";

const listForProfileMock = vi.hoisted(() => vi.fn());
const requireCurrentProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock(
  "@/features/watchlist/infrastructure/drizzle-watchlist-repository",
  () => ({
    createDrizzleWatchlistRepository: () => ({
      listForProfile: listForProfileMock,
    }),
  }),
);

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/tickers/PETR4",
}));

describe("TickersLayout", () => {
  beforeEach(() => {
    listForProfileMock.mockReset();
    listForProfileMock.mockResolvedValue([
      createItem("KNCR11"),
      createItem("PETR4"),
    ]);
    requireCurrentProfileMock.mockReset();
    requireCurrentProfileMock.mockResolvedValue({
      profile: { id: toProfileId("profile-1") },
    });
  });

  it("loads profile assets in the shared ticker layout", async () => {
    render(await TickersLayout({ children: <div>Detalhes do Ativo</div> }));

    expect(listForProfileMock).toHaveBeenCalledTimes(1);
    expect(listForProfileMock).toHaveBeenCalledWith(toProfileId("profile-1"));
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(
      screen.getByRole("link", { name: "Ver detalhes de KNCR11" }),
    ).toHaveAttribute("href", "/dashboard/tickers/KNCR11");
    expect(screen.getByText("Detalhes do Ativo")).toBeInTheDocument();
  });
});

function createItem(symbol: string) {
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
