import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateEmailAlertsPreference } from "./dashboard/settings/actions";
import SettingsPage from "./dashboard/settings/page";
import DashboardPage from "./dashboard/page";
import Home from "./page";

const authMock = vi.hoisted(() => vi.fn());
const eqMock = vi.hoisted(() =>
  vi.fn((left: unknown, right: unknown) => ({ left, right })),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);
const selectLimitMock = vi.hoisted(() => vi.fn());
const selectWhereMock = vi.hoisted(() =>
  vi.fn(() => ({ limit: selectLimitMock })),
);
const selectFromMock = vi.hoisted(() =>
  vi.fn(() => ({ where: selectWhereMock })),
);
const selectMock = vi.hoisted(() => vi.fn(() => ({ from: selectFromMock })));
const updateWhereMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() =>
  vi.fn(() => ({ where: updateWhereMock })),
);
const updateMock = vi.hoisted(() => vi.fn(() => ({ set: updateSetMock })));

vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Home", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    eqMock.mockClear();
    selectMock.mockClear();
    selectFromMock.mockClear();
    selectWhereMock.mockClear();
    selectLimitMock.mockReset();
    updateMock.mockClear();
    updateSetMock.mockClear();
    updateWhereMock.mockReset();
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
  });

  it("renders the protected dashboard shell with the signed-in email", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
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
    authMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});

describe("SettingsPage", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    eqMock.mockClear();
    selectMock.mockClear();
    selectFromMock.mockClear();
    selectWhereMock.mockClear();
    selectLimitMock.mockReset();
  });

  it("renders the signed-in email and enabled alert preference", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    selectLimitMock.mockResolvedValue([{ emailAlertsEnabled: true }]);

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
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    selectLimitMock.mockResolvedValue([{ emailAlertsEnabled: false }]);

    render(await SettingsPage());

    expect(screen.getByText("Desativados")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Alertas por email/ }),
    ).not.toBeChecked();
  });

  it("redirects signed-out users to the sign-in page", async () => {
    authMock.mockResolvedValue(null);

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("redirects when the authenticated user has no settings row", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    selectLimitMock.mockResolvedValue([]);

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});

describe("updateEmailAlertsPreference", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
    eqMock.mockClear();
    updateMock.mockClear();
    updateSetMock.mockClear();
    updateWhereMock.mockReset();
  });

  it("enables email alerts for the current user", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    updateWhereMock.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set("emailAlertsEnabled", "true");
    formData.set("userId", "different-user");

    await updateEmailAlertsPreference(formData);

    expect(updateSetMock).toHaveBeenCalledWith({ emailAlertsEnabled: true });
    expect(eqMock).toHaveBeenCalledWith(expect.anything(), "user-1");
    expect(updateWhereMock).toHaveBeenCalledWith({
      left: expect.anything(),
      right: "user-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("disables email alerts for the current user when the checkbox is omitted", async () => {
    authMock.mockResolvedValue({
      user: { email: "user@example.com", id: "user-1" },
    });
    updateWhereMock.mockResolvedValue(undefined);

    await updateEmailAlertsPreference(new FormData());

    expect(updateSetMock).toHaveBeenCalledWith({ emailAlertsEnabled: false });
    expect(eqMock).toHaveBeenCalledWith(expect.anything(), "user-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("redirects signed-out users without updating settings", async () => {
    authMock.mockResolvedValue(null);

    await expect(updateEmailAlertsPreference(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
