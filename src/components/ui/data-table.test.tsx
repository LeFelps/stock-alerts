import type { ColumnDef } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table";

type Asset = {
  name: string;
  symbol: string;
};

const columns: ColumnDef<Asset>[] = [
  {
    cell: () => <span aria-hidden="true">●</span>,
    enableHiding: false,
    header: "Ícone",
    id: "icon",
  },
  { accessorKey: "symbol", header: "Código" },
  { accessorKey: "name", header: "Nome" },
];

describe("DataTable", () => {
  it("renders bordered table chrome and filters rows with global search", () => {
    render(
      <DataTable
        columnLabels={{ name: "Nome", symbol: "Código" }}
        columns={columns}
        data={[
          { name: "Petrobras", symbol: "PETR4" },
          { name: "Vale", symbol: "VALE3" },
        ]}
      />,
    );

    const table = screen.getByRole("table");
    expect(table.parentElement?.parentElement).toHaveClass("border");
    expect(
      screen.queryByRole("button", { name: "Colunas" }),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar na tabela" }),
      {
        target: { value: "Vale" },
      },
    );

    expect(screen.getByText("VALE3")).toBeInTheDocument();
    expect(screen.queryByText("PETR4")).not.toBeInTheDocument();
  });

  it("toggles hideable columns and keeps fixed columns out of the menu", async () => {
    render(
      <DataTable
        columnLabels={{ name: "Nome", symbol: "Código" }}
        columns={columns}
        data={[{ name: "Petrobras", symbol: "PETR4" }]}
        showColumnPicker
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Colunas" }), {
      button: 0,
      ctrlKey: false,
    });

    const nameOption = await screen.findByRole("menuitemcheckbox", {
      name: "Nome",
    });
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Ícone" }),
    ).not.toBeInTheDocument();

    fireEvent.click(nameOption);
    expect(
      screen.queryByRole("columnheader", { name: "Nome" }),
    ).not.toBeInTheDocument();
  });
});
