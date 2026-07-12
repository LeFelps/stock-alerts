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

  it("keeps the form pending without projecting a row and appends the resolved item", async () => {
    const request = deferred<ReturnType<typeof successItem>>();
    createWatchlistItemMock.mockReturnValue(request.promise);
    const { container } = render(
      <WatchlistManagement items={[]} referenceDate="2026-01-02" />,
    );

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: " pe tr4 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ativo" }));

    expect(screen.queryByText("PETR4")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validando…" })).toBeDisabled();
    expect(screen.queryByLabelText("Nome opcional")).not.toBeInTheDocument();

    await act(async () => request.resolve(successItem()));

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "PETR4 foi adicionado à Lista de acompanhamento.",
      ),
    );
    const longName = screen.getByText("Petróleo Brasileiro S.A. - Petrobras");
    expect(longName).toHaveClass("max-w-64", "truncate");
    expect(longName).toHaveAttribute(
      "title",
      "Petróleo Brasileiro S.A. - Petrobras",
    );
    expect(
      container.querySelector(
        'img[src="https://icons.brapi.dev/icons/PETR4.svg"]',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("preserves form values and explains an invalid symbol", async () => {
    const request = deferred<{ error: "invalid_symbol"; status: "error" }>();
    createWatchlistItemMock.mockReturnValue(request.promise);
    render(<WatchlistManagement items={[]} referenceDate="2026-01-02" />);

    const symbol = screen.getByLabelText("Código") as HTMLInputElement;
    fireEvent.change(symbol, { target: { value: "FAKE4" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ativo" }));
    expect(screen.queryByText("FAKE4")).not.toBeInTheDocument();

    await act(async () =>
      request.resolve({ error: "invalid_symbol", status: "error" }),
    );

    expect(symbol).toHaveValue("FAKE4");
    expect(toastErrorMock).toHaveBeenCalledWith(
      "FAKE4 não é um Código de Ativo válido.",
    );
  });

  it("distinguishes a temporary provider failure from an invalid symbol", async () => {
    createWatchlistItemMock.mockResolvedValue({
      error: "provider_error",
      status: "error",
    });
    render(<WatchlistManagement items={[]} referenceDate="2026-01-02" />);

    fireEvent.change(screen.getByLabelText("Código"), {
      target: { value: "PETR4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ativo" }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Não foi possível validar PETR4 agora. Tente novamente.",
      ),
    );
  });

  it("renders the symbol when a legacy item has no long name", () => {
    const item = successItem().data;
    render(
      <WatchlistManagement
        items={[{ ...item, latestMarketDate: null, longName: null }]}
        referenceDate="2026-01-02"
      />,
    );

    expect(screen.getAllByText("PETR4")).toHaveLength(2);
  });
});

function successItem() {
  return {
    data: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      longName: "Petróleo Brasileiro S.A. - Petrobras",
      logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
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
