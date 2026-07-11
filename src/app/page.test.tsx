import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobsPage from "./dashboard/jobs/page";
import PreferencesPage from "./dashboard/preferences/page";
import SignalsPage from "./dashboard/signals/page";
import SettingsPage from "./dashboard/settings/page";
import TickerPage from "./dashboard/tickers/[symbol]/page";
import DashboardPage from "./dashboard/page";
import Home from "./page";

const authMock = vi.hoisted(() => vi.fn());
const createDrizzleIndicatorSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleJobRunRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzlePriceSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleSignalRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleWatchlistRepositoryMock = vi.hoisted(() => vi.fn());
const findWatchlistItemBySymbolMock = vi.hoisted(() => vi.fn());
const listLatestMarketDataDatesForSymbolsMock = vi.hoisted(() => vi.fn());
const listIndicatorSnapshotsForSymbolMock = vi.hoisted(() => vi.fn());
const listRecentJobRunsMock = vi.hoisted(() => vi.fn());
const latestIndicatorsBySymbolMock = vi.hoisted(() => vi.fn());
const listPriceSnapshotsForSymbolMock = vi.hoisted(() => vi.fn());
const listSignalsForProfileMock = vi.hoisted(() => vi.fn());
const listWatchlistItemsForProfileMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const requireCurrentProfileMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock("@/features/market-data/application/refresh-market-data", () => ({
  listLatestMarketDataDatesForSymbols: listLatestMarketDataDatesForSymbolsMock,
}));

vi.mock("@/features/jobs/application/manage-job-runs", () => ({
  listRecentJobRuns: listRecentJobRunsMock,
}));

vi.mock("@/features/jobs/infrastructure/drizzle-job-run-repository", () => ({
  createDrizzleJobRunRepository: createDrizzleJobRunRepositoryMock,
}));

vi.mock(
  "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository",
  () => ({
    createDrizzleIndicatorSnapshotRepository:
      createDrizzleIndicatorSnapshotRepositoryMock,
  }),
);

vi.mock(
  "@/features/market-data/infrastructure/drizzle-price-snapshot-repository",
  () => ({
    createDrizzlePriceSnapshotRepository:
      createDrizzlePriceSnapshotRepositoryMock,
  }),
);

vi.mock("@/features/market-data/server/market-data.actions", () => ({
  refreshWatchlistItemMarketData: vi.fn(),
}));

vi.mock("@/features/signals/application/manage-signals", () => ({
  listSignalsForProfile: listSignalsForProfileMock,
}));

vi.mock("@/features/signals/infrastructure/drizzle-signal-repository", () => ({
  createDrizzleSignalRepository: createDrizzleSignalRepositoryMock,
}));

vi.mock("@/features/watchlist/application/manage-watchlist", () => ({
  listWatchlistItemsForProfile: listWatchlistItemsForProfileMock,
}));

vi.mock(
  "@/features/watchlist/infrastructure/drizzle-watchlist-repository",
  () => ({
    createDrizzleWatchlistRepository: createDrizzleWatchlistRepositoryMock,
  }),
);

vi.mock("@/features/watchlist/server/watchlist.actions", () => ({
  createWatchlistItem: vi.fn(),
  deleteWatchlistItem: vi.fn(),
  setWatchlistItemEnabled: vi.fn(),
  updateWatchlistItem: vi.fn(),
}));

vi.mock(
  "@/features/profiles/server/update-email-alerts-preference.action",
  () => ({
    updateEmailAlertsPreference: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

describe("Home", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders the Google sign-in entry when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Entrar no painel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toBeInTheDocument();
  });

  it("redirects authenticated users to the dashboard", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });

    await expect(Home({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders a concise sign-in error message", async () => {
    authMock.mockResolvedValue(null);

    render(
      await Home({ searchParams: Promise.resolve({ error: "AccessDenied" }) }),
    );

    expect(
      screen.getByText(/Não foi possível entrar com essa conta/),
    ).toBeInTheDocument();
  });
});

describe("DashboardPage", () => {
  beforeEach(() => {
    authMock.mockReset();
    createDrizzleIndicatorSnapshotRepositoryMock.mockReset();
    createDrizzleIndicatorSnapshotRepositoryMock.mockReturnValue({
      latestBySymbol: latestIndicatorsBySymbolMock,
      listForSymbol: listIndicatorSnapshotsForSymbolMock,
    });
    createDrizzlePriceSnapshotRepositoryMock.mockReset();
    createDrizzlePriceSnapshotRepositoryMock.mockReturnValue({
      listForSymbol: listPriceSnapshotsForSymbolMock,
      type: "price-snapshot-repository",
    });
    createDrizzleSignalRepositoryMock.mockReset();
    createDrizzleSignalRepositoryMock.mockReturnValue({
      type: "signal-repository",
    });
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      findBySymbol: findWatchlistItemBySymbolMock,
      type: "watchlist-repository",
    });
    findWatchlistItemBySymbolMock.mockReset();
    listIndicatorSnapshotsForSymbolMock.mockReset();
    listIndicatorSnapshotsForSymbolMock.mockResolvedValue([]);
    latestIndicatorsBySymbolMock.mockReset();
    latestIndicatorsBySymbolMock.mockResolvedValue(new Map());
    listLatestMarketDataDatesForSymbolsMock.mockReset();
    listLatestMarketDataDatesForSymbolsMock.mockResolvedValue(new Map());
    listPriceSnapshotsForSymbolMock.mockReset();
    listPriceSnapshotsForSymbolMock.mockResolvedValue([]);
    listSignalsForProfileMock.mockReset();
    listSignalsForProfileMock.mockResolvedValue([]);
    listWatchlistItemsForProfileMock.mockReset();
    listWatchlistItemsForProfileMock.mockResolvedValue([]);
    notFoundMock.mockClear();
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders the protected dashboard shell with the signed-in email", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(screen.getByText("Painel protegido")).toBeInTheDocument();
    expect(screen.getByText("Sessão ativa")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Dashboard/ })[0],
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getAllByRole("link", { name: /Sinais/ })[0]).toHaveAttribute(
      "href",
      "/dashboard/signals",
    );
    expect(
      screen.getAllByRole("link", { name: /Execuções/ })[0],
    ).toHaveAttribute("href", "/dashboard/jobs");
    expect(
      screen.getAllByRole("link", { name: /Configurações/ })[0],
    ).toHaveAttribute("href", "/dashboard/settings");
    expect(
      screen.getAllByRole("link", { name: /Preferências/ })[0],
    ).toHaveAttribute("href", "/dashboard/preferences");
    expect(listWatchlistItemsForProfileMock).toHaveBeenCalledWith(
      { profileId: "profile-1" },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
    expect(latestIndicatorsBySymbolMock).toHaveBeenCalledWith([]);
    expect(screen.queryByText("Adicionar ativo")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Lista de acompanhamento"),
    ).not.toBeInTheDocument();
  });

  it("opens the mobile navigation with reduced-motion-safe transitions", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await DashboardPage());
    fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));

    const drawer = screen.getByRole("dialog");
    expect(drawer).toHaveClass("transition-transform");
    expect(drawer).toHaveClass("motion-reduce:transition-none");
    expect(drawer).toHaveClass("data-[state=open]:translate-x-0");
    expect(drawer).toHaveClass("data-[state=closed]:-translate-x-full");
  });

  it("renders the watchlist rows returned for the current profile", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    listLatestMarketDataDatesForSymbolsMock.mockResolvedValue(
      new Map([["PETR4", "2026-01-02"]]),
    );
    latestIndicatorsBySymbolMock.mockResolvedValue(
      new Map([
        [
          "PETR4",
          {
            close: 31.1,
            ema6: 30.5,
            ema13: 29.75,
            ema42: null,
            marketDate: "2026-01-02",
            source: "brapi",
            symbol: "PETR4",
          },
        ],
      ]),
    );
    listWatchlistItemsForProfileMock.mockResolvedValue([
      {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        displayName: "Petrobras",
        enabled: true,
        id: "item-1",
        notes: "Acompanhar resultados",
        profileId: "profile-1",
        symbol: "PETR4",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    render(await DashboardPage());

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText("Aguardando regra")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "MME6" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "MME13" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "MME42" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir/ })).toHaveAttribute(
      "href",
      "/dashboard/tickers/PETR4",
    );
    expect(
      screen.queryByRole("button", { name: /Atualizar/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("PETR4")).not.toBeInTheDocument();
    expect(screen.getByRole("table").parentElement).toHaveClass(
      "overflow-x-auto",
    );
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(listWatchlistItemsForProfileMock).not.toHaveBeenCalled();
  });
});

describe("TickerPage", () => {
  beforeEach(() => {
    createDrizzleIndicatorSnapshotRepositoryMock.mockReset();
    createDrizzleIndicatorSnapshotRepositoryMock.mockReturnValue({
      latestBySymbol: latestIndicatorsBySymbolMock,
      listForSymbol: listIndicatorSnapshotsForSymbolMock,
    });
    createDrizzlePriceSnapshotRepositoryMock.mockReset();
    createDrizzlePriceSnapshotRepositoryMock.mockReturnValue({
      listForSymbol: listPriceSnapshotsForSymbolMock,
      type: "price-snapshot-repository",
    });
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      findBySymbol: findWatchlistItemBySymbolMock,
      type: "watchlist-repository",
    });
    findWatchlistItemBySymbolMock.mockReset();
    listIndicatorSnapshotsForSymbolMock.mockReset();
    listPriceSnapshotsForSymbolMock.mockReset();
    notFoundMock.mockClear();
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders market history only after confirming the ticker is in the profile watchlist", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    findWatchlistItemBySymbolMock.mockResolvedValue({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      displayName: "Petrobras",
      enabled: true,
      id: "item-1",
      notes: null,
      profileId: "profile-1",
      symbol: "PETR4",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    listPriceSnapshotsForSymbolMock.mockResolvedValue([
      {
        adjustedClose: 31.1,
        close: 31.1,
        currency: "BRL",
        fetchedAt: new Date("2026-01-02T12:00:00.000Z"),
        high: 32,
        low: 30,
        marketDate: "2026-01-02",
        open: 30.5,
        rawPayload: { close: 31.1 },
        source: "brapi",
        symbol: "PETR4",
        volume: 1000,
      },
    ]);
    listIndicatorSnapshotsForSymbolMock.mockResolvedValue([
      {
        close: 31.1,
        ema6: 30.5,
        ema13: 29.75,
        ema42: null,
        marketDate: "2026-01-02",
        source: "brapi",
        symbol: "PETR4",
      },
    ]);

    render(await TickerPage({ params: Promise.resolve({ symbol: "petr4" }) }));

    expect(findWatchlistItemBySymbolMock).toHaveBeenCalledWith({
      profileId: "profile-1",
      symbol: "PETR4",
    });
    expect(listPriceSnapshotsForSymbolMock).toHaveBeenCalledWith("PETR4");
    expect(listIndicatorSnapshotsForSymbolMock).toHaveBeenCalledWith("PETR4");
    expect(screen.getByRole("heading", { name: "PETR4" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Trilha de navegação" }),
    ).toHaveTextContent("DashboardAtivosPETR4");
    expect(
      screen
        .getByRole("navigation", { name: "Trilha de navegação" })
        .querySelector('a[href="/dashboard"]'),
    ).toHaveTextContent("Dashboard");
    expect(screen.getByText("PETR4", { selector: "span" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Preços de fechamento")).toBeInTheDocument();
    expect(screen.getByText("Dados do gráfico MME")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "MME6" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "MME13" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "MME42" })).toBeVisible();
    expect(screen.getByText("Snapshots brutos")).toBeInTheDocument();
    expect(screen.getAllByText(/31,10/).length).toBeGreaterThan(1);
  });

  it("renders not found when the ticker is outside the current profile watchlist", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    findWatchlistItemBySymbolMock.mockResolvedValue(null);

    await expect(
      TickerPage({ params: Promise.resolve({ symbol: "VALE3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listPriceSnapshotsForSymbolMock).not.toHaveBeenCalled();
    expect(listIndicatorSnapshotsForSymbolMock).not.toHaveBeenCalled();
  });
});

describe("SignalsPage", () => {
  beforeEach(() => {
    createDrizzleSignalRepositoryMock.mockReset();
    createDrizzleSignalRepositoryMock.mockReturnValue({
      type: "signal-repository",
    });
    listSignalsForProfileMock.mockReset();
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders current profile signal history", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    listSignalsForProfileMock.mockResolvedValue([
      {
        createdAt: new Date("2026-01-02T12:00:00.000Z"),
        id: "signal-1",
        marketDate: "2026-01-02",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "PETR4",
      },
      {
        createdAt: new Date("2026-01-03T12:00:00.000Z"),
        id: "signal-2",
        marketDate: "2026-01-03",
        profileId: "profile-1",
        reason: "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42",
        signalType: "BUY",
        symbol: "VALE3",
      },
    ]);

    render(await SignalsPage());

    expect(screen.getByRole("heading", { name: "Sinais" })).toBeInTheDocument();
    expect(listSignalsForProfileMock).toHaveBeenCalledWith(
      { profileId: "profile-1" },
      { signalRepository: { type: "signal-repository" } },
    );
    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getAllByText("Compra técnica")).toHaveLength(2);
    expect(screen.getByText("02/01/2026")).toBeInTheDocument();
    expect(screen.getByText("MME6 > MME42")).toBeInTheDocument();
    expect(screen.getByText("MME6 > MME13 > MME42")).toBeInTheDocument();
  });

  it("renders an empty state for profiles without signals", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    listSignalsForProfileMock.mockResolvedValue([]);

    render(await SignalsPage());

    expect(screen.getByText("Nenhum Sinal registrado.")).toBeInTheDocument();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(SignalsPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(listSignalsForProfileMock).not.toHaveBeenCalled();
  });
});

describe("JobsPage", () => {
  beforeEach(() => {
    createDrizzleJobRunRepositoryMock.mockReset();
    createDrizzleJobRunRepositoryMock.mockReturnValue({
      type: "job-run-repository",
    });
    listRecentJobRunsMock.mockReset();
    listRecentJobRunsMock.mockResolvedValue([]);
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders recent scheduled job runs", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    listRecentJobRunsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-01-02T12:00:00.000Z"),
        durationMs: 1250,
        error: null,
        finishedAt: new Date("2026-01-02T12:00:01.250Z"),
        id: "job-run-1",
        jobName: "CHECK_ALERTS",
        startedAt: new Date("2026-01-02T12:00:00.000Z"),
        status: "SUCCESS",
        summary: {
          createdSignals: 2,
          enabledTargets: 3,
          failedEmails: 0,
          refreshedSymbols: 1,
          sentEmails: 1,
          skippedEmails: 1,
          uniqueSymbols: 1,
        },
        updatedAt: new Date("2026-01-02T12:00:01.250Z"),
      },
    ]);

    render(await JobsPage());

    expect(
      screen.getByRole("heading", { name: "Execuções" }),
    ).toBeInTheDocument();
    expect(listRecentJobRunsMock).toHaveBeenCalledWith(
      { limit: 20 },
      { jobRunRepository: { type: "job-run-repository" } },
    );
    expect(screen.getByText("Sucesso")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText("1 enviados · 1 ignorados · 0 falharam"),
    ).toBeInTheDocument();
  });

  it("renders an empty state for profiles without job runs", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await JobsPage());

    expect(
      screen.getByText("Nenhuma execução registrada."),
    ).toBeInTheDocument();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(JobsPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(listRecentJobRunsMock).not.toHaveBeenCalled();
  });
});

describe("SettingsPage", () => {
  beforeEach(() => {
    createDrizzlePriceSnapshotRepositoryMock.mockReset();
    createDrizzlePriceSnapshotRepositoryMock.mockReturnValue({
      type: "price-snapshot-repository",
    });
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      type: "watchlist-repository",
    });
    listLatestMarketDataDatesForSymbolsMock.mockReset();
    listLatestMarketDataDatesForSymbolsMock.mockResolvedValue(new Map());
    listWatchlistItemsForProfileMock.mockReset();
    listWatchlistItemsForProfileMock.mockResolvedValue([]);
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders Lista de acompanhamento management", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await SettingsPage());

    expect(
      screen.getByRole("heading", { name: "Configurações" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adicionar ativo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A Lista de acompanhamento está vazia."),
    ).toBeInTheDocument();
    expect(listWatchlistItemsForProfileMock).toHaveBeenCalledWith(
      { profileId: "profile-1" },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
  });

  it("renders existing Ativos with all management actions", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: false }),
    });

    listWatchlistItemsForProfileMock.mockResolvedValue([
      {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        displayName: "Petrobras",
        enabled: true,
        id: "item-1",
        notes: null,
        profileId: "profile-1",
        symbol: "PETR4",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    render(await SettingsPage());

    expect(screen.getByText("PETR4")).toBeInTheDocument();
    expect(screen.getByText("Petrobras")).toBeInTheDocument();
    expect(screen.getByText("Sem observações")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("PETR4")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Atualizar/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pausar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Excluir/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("PETR4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeInTheDocument();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT:/");
  });
});

describe("PreferencesPage", () => {
  beforeEach(() => {
    requireCurrentProfileMock.mockReset();
  });

  it("renders profile and email-alert preferences on their own route", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await PreferencesPage());

    expect(
      screen.getByRole("heading", { name: "Preferências" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Email de acesso")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Alertas por email/ }),
    ).toBeChecked();
  });
});

function createProfile({
  emailAlertsEnabled,
}: {
  emailAlertsEnabled: boolean;
}) {
  return {
    authUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    emailAlertsEnabled,
    id: "profile-1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
