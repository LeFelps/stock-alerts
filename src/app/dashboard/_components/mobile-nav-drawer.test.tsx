import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    onNavigate,
    ...props
  }: ComponentProps<"a"> & {
    onNavigate?: () => void;
  }) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
      }}
    />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { MobileNavDrawer } from "./mobile-nav-drawer";

describe("MobileNavDrawer", () => {
  it("closes after navigating from the drawer", async () => {
    render(<MobileNavDrawer />);

    const trigger = screen.getByRole("button", { name: "Abrir navegação" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: "Configurações" }));

    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false"),
    );
  });
});
