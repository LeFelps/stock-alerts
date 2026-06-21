import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./dashboard/page";
import Home from "./page";

const authMock = vi.hoisted(() => vi.fn());
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

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Home", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
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
  });

  it("redirects signed-out users to the sign-in page", async () => {
    authMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
