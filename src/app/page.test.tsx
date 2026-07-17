import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobsPage from "./dashboard/jobs/page";
import JobsLayout from "./dashboard/jobs/layout";
import PreferencesPage from "./dashboard/preferences/page";
import SignalsPage from "./dashboard/signals/page";
import SettingsPage from "./dashboard/settings/page";
import TickerPage from "./dashboard/tickers/[symbol]/page";
import DashboardLayout from "./dashboard/layout";
import DashboardPage from "./dashboard/page";
import Home from "./page";

const authMock = vi.hoisted(() => vi.fn());
const createDrizzleIndicatorSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleJobRunRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzlePriceSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleSignalRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleWatchlistRepositoryMock = vi.hoisted(() => vi.fn());
const findWatchlistItemBySymbolMock = vi.hoisted(() => vi.fn());
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
const requireSuperProfileMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);
const routerPushMock = vi.hoisted(() => vi.fn());
const routerRefreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
  requireSuperProfile: requireSuperProfileMock,
}));

vi.mock("@/features/jobs/application/manage-job-runs", () => ({
  listRecentJobRuns: listRecentJobRunsMock,
}));

vi.mock("@/features/jobs/server/retry-check-alerts-job.action", () => ({
  retryCheckAlertsJob: vi.fn(),
}));

vi.mock("@/features/jobs/server/trigger-check-alerts-job.action", () => ({
  triggerCheckAlertsJob: vi.fn(),
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

vi.mock("@/features/role-access/server/unlock-super-access.action", () => ({
  unlockSuperAccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: routerPushMock, refresh: routerRefreshMock }),
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
    expect(
      screen.queryByText(/próximos fluxos do MVP/),
    ).not.toBeInTheDocument();
  });

  it("presents the app flow", async () => {
    authMock.mockResolvedValue(null);

    render(await Home({ searchParams: Promise.resolve({}) }));

    const flow = screen.getByRole("list");

    expect(within(flow).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(flow).getByRole("heading", { name: "Configure" }),
    ).toBeInTheDocument();
    expect(
      within(flow).getByRole("heading", { name: "Monitore" }),
    ).toBeInTheDocument();
    expect(
      within(flow).getByRole("heading", { name: "Receba alertas" }),
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

    render(
      await DashboardLayout({
        children: await DashboardPage(),
      }),
    );

    expect(screen.getByRole("heading", { name: "Stock Alerts" })).toHaveClass(
      "font-extrabold",
    );
    expect(screen.queryByText("Painel protegido")).not.toBeInTheDocument();
    expect(screen.queryByText("Sessão ativa")).not.toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toHaveClass(
      "select-none",
      "truncate",
      "max-w-[25vw]",
    );
    expect(screen.getByRole("banner")).not.toHaveClass("border-b");
    expect(
      screen.getByRole("navigation", { name: "Seções do painel" }),
    ).toHaveClass(
      "flex",
      "justify-start",
      "overflow-hidden",
      "rounded-xl",
      "bg-card",
      "shadow-sm",
    );
    expect(
      screen.getAllByRole("link", { name: /Monitoramento/ })[0],
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.getAllByRole("link", { name: /Monitoramento/ })[0],
    ).toHaveClass("font-semibold", "after:bg-primary", "rounded-none");
    expect(screen.getAllByRole("link", { name: /Sinais/ })[0]).toHaveAttribute(
      "href",
      "/dashboard/signals",
    );
    expect(
      screen.queryByRole("link", { name: /Execuções/ }),
    ).not.toBeInTheDocument();
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
    expect(
      screen
        .getByText("Nenhum Ativo em acompanhamento.")
        .closest('[data-slot="empty-state"]'),
    ).toHaveClass("rounded-lg", "border", "bg-muted/40");
    expect(screen.queryByText("Adicionar ativo")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Lista de acompanhamento"),
    ).not.toBeInTheDocument();
  });

  it("uses the tab bar as icon-only mobile navigation", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(
      await DashboardLayout({
        children: await DashboardPage(),
      }),
    );
    const monitorTab = screen.getByRole("link", { name: "Monitoramento" });
    const navigation = screen.getByRole("navigation", {
      name: "Seções do painel",
    });

    expect(monitorTab).toHaveClass("size-14", "lg:w-auto");
    expect(navigation).toHaveClass("w-fit", "lg:w-full");
    expect(navigation.parentElement).toHaveClass(
      "fixed",
      "bottom-4",
      "justify-center",
      "lg:static",
    );
    expect(monitorTab.querySelector("svg")).toHaveClass("lg:hidden");
    expect(within(monitorTab).getByText("Monitoramento")).toHaveClass(
      "hidden",
      "lg:inline",
    );
    expect(
      screen.queryByRole("button", { name: "Abrir navegação" }),
    ).not.toBeInTheDocument();
  });

  it("shows the jobs navigation after role access is granted", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true, role: "SUPER" }),
    });

    render(await DashboardLayout({ children: null }));

    expect(screen.getByRole("link", { name: "Execuções" })).toHaveAttribute(
      "href",
      "/dashboard/jobs",
    );
  });

  it("renders the watchlist rows returned for the current profile", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });
    latestIndicatorsBySymbolMock.mockResolvedValue(
      new Map([
        [
          "PETR4",
          {
            close: 31.1,
            ema6: 30.5,
            ema13: 29.75,
            ema42: 28.5,
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
        longName: "Petrobras",
        logoUrl: null,
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
    expect(screen.getByText("Petrobras")).toHaveClass("text-muted-foreground");
    expect(
      screen.getByRole("columnheader", { name: "Ícone" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Buscar na tabela" }),
    ).toHaveAttribute("placeholder", "Buscar ativos…");
    expect(screen.getByRole("button", { name: "Colunas" })).toBeInTheDocument();
    expect(screen.getByText("Compra")).toHaveClass(
      "border-green-200",
      "bg-green-100",
      "text-green-800",
    );
    expect(
      screen.queryByRole("columnheader", { name: "MME6" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "MME13" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "MME42" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver gráficos de PETR4" }),
    ).toHaveAttribute("href", "/dashboard/tickers/PETR4");
    expect(
      screen.queryByRole("columnheader", { name: "Detalhes" }),
    ).not.toBeInTheDocument();
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
    const watchlistItem = {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      longName: "Petrobras",
      logoUrl: null,
      enabled: true,
      id: "item-1",
      notes: null,
      profileId: "profile-1",
      symbol: "PETR4",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    findWatchlistItemBySymbolMock.mockResolvedValue(watchlistItem);
    listPriceSnapshotsForSymbolMock.mockResolvedValue([
      {
        adjustedClose: 30.25,
        close: 30.25,
        currency: "BRL",
        fetchedAt: new Date("2026-01-01T12:00:00.000Z"),
        high: 31,
        low: 29.5,
        marketDate: "2026-01-01",
        open: 30,
        rawPayload: { close: 30.25 },
        source: "brapi",
        symbol: "PETR4",
        volume: 900,
      },
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
        close: 30.25,
        ema6: 30,
        ema13: 29.5,
        ema42: null,
        marketDate: "2026-01-01",
        source: "brapi",
        symbol: "PETR4",
      },
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
    expect(
      screen.getByRole("heading", { name: "Detalhes de PETR4" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Último preço")).toBeInTheDocument();
    expect(screen.getByText("Última atualização")).toBeInTheDocument();
    expect(screen.getByText("MME6")).toBeInTheDocument();
    expect(screen.getByText("MME13")).toBeInTheDocument();
    expect(screen.getByText("MME42")).toBeInTheDocument();
    const previousValueInfo = screen.getByRole("button", {
      name: "Data do valor anterior de Último preço",
    });
    expect(previousValueInfo).toHaveAccessibleDescription(
      "Valor anterior registrado em 01/01/2026.",
    );
    fireEvent.pointerEnter(previousValueInfo, { pointerType: "mouse" });
    expect(
      within(await screen.findByRole("tooltip")).getByText(
        "Valor anterior registrado em 01/01/2026.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dados insuficientes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Manter")).toBeInTheDocument();
    expect(screen.queryByText("Abertura")).toBeNull();
    expect(screen.queryByText("Volume")).toBeNull();
    expect(screen.getByText("Médias móveis exponenciais")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Gráfico de linhas das médias móveis exponenciais",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Oscilação de preços")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Gráfico de candles da oscilação de preços",
      }),
    ).toBeInTheDocument();
    fireEvent.pointerEnter(
      screen.getByLabelText(
        "Exibir detalhes de 02/01/2026 no gráfico de médias",
      ),
    );
    const emaTooltip = screen.getByRole("tooltip", {
      name: "Detalhes do gráfico em 02/01/2026",
    });
    expect(within(emaTooltip).getByText("MME 13")).toBeVisible();
    expect(within(emaTooltip).getByText("R$ 29,75")).toBeVisible();
    fireEvent.pointerLeave(
      screen.getByRole("img", {
        name: "Gráfico de linhas das médias móveis exponenciais",
      }),
    );
    fireEvent.pointerEnter(
      screen.getByLabelText(
        "Exibir detalhes de 02/01/2026 no gráfico de preços",
      ),
    );
    expect(
      within(
        screen.getByRole("tooltip", {
          name: "Detalhes do gráfico em 02/01/2026",
        }),
      ).getByText("Abertura"),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("tooltip", {
          name: "Detalhes do gráfico em 02/01/2026",
        }),
      ).getByText("R$ 30,50"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /atualizar/i })).toBeNull();
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
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      type: "watchlist-repository",
    });
    listSignalsForProfileMock.mockReset();
    listWatchlistItemsForProfileMock.mockReset();
    listWatchlistItemsForProfileMock.mockResolvedValue([]);
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
    expect(
      screen.getByRole("columnheader", { name: "Ícone" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Data" }),
    ).toBeInTheDocument();
    const buyBadges = screen.getAllByText("Compra técnica");
    expect(buyBadges).toHaveLength(2);
    expect(buyBadges[0]).toHaveClass(
      "border-green-200",
      "bg-green-100",
      "text-green-800",
    );
    expect(screen.getByText("02/01/2026")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("cell")
        .some((cell) => cell.textContent === "MME6 > MME42"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("cell")
        .some((cell) => cell.textContent === "MME6 > MME13 > MME42"),
    ).toBe(true);
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
    requireSuperProfileMock.mockReset();
    requireSuperProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true, role: "SUPER" }),
    });
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
    expect(screen.getByText("Sucesso")).toHaveClass(
      "border-green-200",
      "bg-green-100",
      "text-green-800",
    );
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

  it("redirects users without jobs access before loading job runs", async () => {
    requireSuperProfileMock.mockRejectedValue(
      new Error("NEXT_REDIRECT:/dashboard"),
    );

    await expect(JobsPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(listRecentJobRunsMock).not.toHaveBeenCalled();
  });

  it("guards the jobs loading boundary with the same role access", async () => {
    requireSuperProfileMock.mockRejectedValue(
      new Error("NEXT_REDIRECT:/dashboard"),
    );

    await expect(JobsLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );

    expect(requireSuperProfileMock).toHaveBeenCalledOnce();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );
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
        longName: "Petrobras",
        logoUrl: null,
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
    expect(
      screen.getByRole("img", { name: "Logo padrão de PETR4" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sem observações de PETR4" }),
    ).toBeDisabled();
    expect(
      screen.queryByText("Nenhuma observação cadastrada."),
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("PETR4")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Atualizar/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Dados de mercado" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Ícone" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Colunas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Observações" }).firstChild,
    ).toHaveClass("text-center");
    expect(
      screen.getByRole("columnheader", { name: "Status" }).firstChild,
    ).toHaveClass("text-center");
    expect(
      screen.getByRole("button", { name: "Sem observações de PETR4" })
        .parentElement,
    ).toHaveClass("justify-center");
    expect(screen.getByText("Ativo").parentElement).toHaveClass("text-center");
    expect(
      screen.getByRole("button", { name: "Pausar PETR4" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Excluir/ }),
    ).not.toBeInTheDocument();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Mais ações para PETR4" }),
      { button: 0, ctrlKey: false },
    );
    expect(
      await screen.findByRole("menuitem", { name: "Excluir" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("PETR4")).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Observações" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeInTheDocument();
  });

  it("renders observations in a portalled hover card", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: false }),
    });
    listWatchlistItemsForProfileMock.mockResolvedValue([
      {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        longName: "Petrobras",
        logoUrl: null,
        enabled: true,
        id: "item-1",
        notes: "Acompanhar resultados trimestrais",
        profileId: "profile-1",
        symbol: "PETR4",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    render(await SettingsPage());

    const trigger = screen.getByRole("button", {
      name: "Ver observações de PETR4",
    });
    const tableContainer = trigger.closest('[data-slot="table-container"]');

    expect(trigger).toHaveAccessibleDescription(
      "Acompanhar resultados trimestrais",
    );

    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });

    const hoverCard = await screen.findByRole("tooltip");
    expect(within(hoverCard).getByText("Observação")).toBeInTheDocument();
    expect(
      within(hoverCard).getByText("Acompanhar resultados trimestrais"),
    ).toBeInTheDocument();
    expect(tableContainer).not.toContainElement(hoverCard);
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
    expect(
      screen.getByText(
        /O monitoramento automático é executado de terça a sábado, às 8h/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Prévia do email")).not.toBeInTheDocument();
  });
});

function createProfile({
  emailAlertsEnabled,
  role = "USER",
}: {
  emailAlertsEnabled: boolean;
  role?: "SUPER" | "USER";
}) {
  return {
    authUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    emailAlertsEnabled,
    id: "profile-1",
    role,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
