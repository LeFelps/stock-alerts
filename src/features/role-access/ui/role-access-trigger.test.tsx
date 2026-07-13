import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoleAccessTrigger } from "./role-access-trigger";

const routerRefreshMock = vi.hoisted(() => vi.fn());
const toastInfoMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const unlockSuperAccessMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { info: toastInfoMock, success: toastSuccessMock },
}));

vi.mock("../server/unlock-super-access.action", () => ({
  unlockSuperAccess: unlockSuperAccessMock,
}));

describe("RoleAccessTrigger", () => {
  beforeEach(() => {
    routerRefreshMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();
    unlockSuperAccessMock.mockReset();
  });

  it("reveals the password dialog after five quick email presses", () => {
    render(<RoleAccessTrigger email="long-user@example.com" isSuper={false} />);
    const email = screen.getByRole("button", {
      name: "long-user@example.com",
    });

    expect(email).toHaveClass("select-none", "truncate", "max-w-[25vw]");

    for (let press = 0; press < 4; press += 1) fireEvent.click(email);
    expect(
      screen.queryByRole("dialog", { name: "Acesso superior" }),
    ).not.toBeInTheDocument();

    fireEvent.click(email);

    expect(
      screen.getByRole("dialog", { name: "Acesso superior" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Informe a senha para obter acesso superior."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("shows an error when the password is incorrect", async () => {
    unlockSuperAccessMock.mockResolvedValue({
      error: "invalid_password",
      status: "error",
    });
    render(<RoleAccessTrigger email="user@example.com" isSuper={false} />);
    const email = screen.getByRole("button", { name: "user@example.com" });
    for (let press = 0; press < 5; press += 1) fireEvent.click(email);

    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Acessar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Senha incorreta.",
    );
  });

  it("closes the dialog and confirms when SUPER access is granted", async () => {
    unlockSuperAccessMock.mockResolvedValue({
      role: "SUPER",
      status: "success",
    });
    render(<RoleAccessTrigger email="user@example.com" isSuper={false} />);
    const email = screen.getByRole("button", { name: "user@example.com" });
    for (let press = 0; press < 5; press += 1) fireEvent.click(email);

    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "role-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Acessar" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Acesso superior liberado.",
      );
    });
    expect(
      screen.queryByRole("dialog", { name: "Acesso superior" }),
    ).not.toBeInTheDocument();
    expect(routerRefreshMock).toHaveBeenCalledOnce();
  });

  it("informs SUPER users instead of opening the dialog", () => {
    render(<RoleAccessTrigger email="user@example.com" isSuper />);
    const email = screen.getByRole("button", { name: "user@example.com" });

    for (let press = 0; press < 5; press += 1) fireEvent.click(email);

    expect(toastInfoMock).toHaveBeenCalledWith(
      "Você já possui acesso superior.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
