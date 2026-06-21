import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the protected dashboard placeholder shell in pt-BR", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(screen.getByText("Painel protegido")).toBeInTheDocument();
    expect(screen.getByText("Autenticação pendente")).toBeInTheDocument();
    expect(screen.getByText("Visão geral")).toBeInTheDocument();
    expect(screen.getByText("Regras de alerta")).toBeInTheDocument();
  });
});
