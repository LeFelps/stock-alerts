import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toWatchlistItemId } from "@/features/watchlist/domain/watchlist-item";

import { WatchlistManagement } from "./watchlist-management";

const createWatchlistItemMock = vi.hoisted(() => vi.fn());
const deleteWatchlistItemMock = vi.hoisted(() => vi.fn());
const refreshWatchlistItemMarketDataMock = vi.hoisted(() => vi.fn());
const setWatchlistItemEnabledMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const updateWatchlistItemMock = vi.hoisted(() => vi.fn());

vi.mock("../server/watchlist.actions", () => ({
  createWatchlistItem: createWatchlistItemMock,
  deleteWatchlistItem: deleteWatchlistItemMock,
  setWatchlistItemEnabled: setWatchlistItemEnabledMock,
  updateWatchlistItem: updateWatchlistItemMock,
}));

vi.mock("@/features/market-data/server/market-data.actions", () => ({
  refreshWatchlistItemMarketData: refreshWatchlistItemMarketDataMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

describe("WatchlistManagement optimistic actions", () => {
  beforeEach(() => {
    createWatchlistItemMock.mockReset();
    deleteWatchlistItemMock.mockReset();
    refreshWatchlistItemMarketDataMock.mockReset();
    setWatchlistItemEnabledMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    updateWatchlistItemMock.mockReset();
  });

  it("shows a submitted item immediately and reconciles it on success", async () => {
    const request = deferred<ReturnType<typeof successItem>>();
    createWatchlistItemMock.mockReturnValue(request.promise);
    render(<WatchlistManagement items={[]} referenceDate="2026-01-02" />);

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: " pe tr4 " },
    });
    fireEvent.change(screen.getByLabelText("Nome opcional"), {
      target: { value: "Petrobras" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ativo" }));

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getAllByText("Adicionando…")).toHaveLength(2);

    await act(async () => request.resolve(successItem()));

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "PETR4 foi adicionado à Lista de acompanhamento.",
      ),
    );
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("rolls an optimistic add back and restores form values on failure", async () => {
    const request = deferred<{ error: "duplicate_symbol"; status: "error" }>();
    createWatchlistItemMock.mockReturnValue(request.promise);
    render(<WatchlistManagement items={[]} referenceDate="2026-01-02" />);

    const symbol = screen.getByLabelText("Código") as HTMLInputElement;
    fireEvent.change(symbol, { target: { value: "PETR4" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ativo" }));
    expect(screen.getByText("PETR4")).toBeInTheDocument();

    await act(async () =>
      request.resolve({ error: "duplicate_symbol", status: "error" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("PETR4")).not.toBeInTheDocument(),
    );
    expect(symbol).toHaveValue("PETR4");
    expect(toastErrorMock).toHaveBeenCalledWith(
      "PETR4 já está na Lista de acompanhamento.",
    );
  });
});

function successItem() {
  return {
    data: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      displayName: "Petrobras",
      enabled: true,
      id: toWatchlistItemId("item-1"),
      notes: null,
      profileId: toProfileId("profile-1"),
      symbol: "PETR4",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    status: "success" as const,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
