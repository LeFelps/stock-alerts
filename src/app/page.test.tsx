import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "./dashboard/settings/page";
import DashboardPage from "./dashboard/page";
import Home from "./page";

const authMock = vi.hoisted(() => vi.fn());
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

vi.mock(
  "@/features/profiles/server/update-email-alerts-preference.action",
  () => ({
    updateEmailAlertsPreference: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
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
    expect(screen.getByText("Visão geral")).toBeInTheDocument();
    expect(screen.getByText("Regras de alerta")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Configurações/ })[0],
    ).toHaveAttribute("href", "/dashboard/settings");
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/");
  });
});

describe("SettingsPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    requireCurrentProfileMock.mockReset();
  });

  it("renders the signed-in email and enabled alert preference", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: true }),
    });

    render(await SettingsPage());

    expect(
      screen.getByRole("heading", { name: "Configurações" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Email de acesso")).toBeInTheDocument();
    expect(screen.getAllByText("user@example.com")).toHaveLength(2);
    expect(screen.getByText("Ativados")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Alertas por email/ }),
    ).toBeChecked();
  });

  it("renders the disabled alert preference", async () => {
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: createProfile({ emailAlertsEnabled: false }),
    });

    render(await SettingsPage());

    expect(screen.getByText("Desativados")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Alertas por email/ }),
    ).not.toBeChecked();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT:/");
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
