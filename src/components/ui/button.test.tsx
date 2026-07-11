import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it.each([
    ["default", "h-10"],
    ["sm", "h-9"],
    ["lg", "h-11"],
    ["icon", "size-10"],
    ["icon-sm", "size-9"],
    ["icon-lg", "size-11"],
  ] as const)("applies the %s size scale", (size, expectedClass) => {
    render(<Button size={size}>Ação</Button>);

    expect(screen.getByRole("button", { name: "Ação" })).toHaveClass(
      expectedClass,
    );
  });

  it("gives link-backed and form buttons equivalent dimensions", () => {
    render(
      <div>
        <Button asChild size="sm">
          <a href="/dashboard">Abrir</a>
        </Button>
        <Button size="sm">Salvar</Button>
      </div>,
    );

    expect(screen.getByRole("link", { name: "Abrir" })).toHaveClass("h-9");
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass("h-9");
  });
});
