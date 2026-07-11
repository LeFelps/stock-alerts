import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table } from "./table";

describe("Table", () => {
  it("uses the available width and keeps horizontal overflow as a fallback", () => {
    render(
      <Table aria-label="Ativos">
        <tbody>
          <tr>
            <td>PETR4</td>
          </tr>
        </tbody>
      </Table>,
    );

    const table = screen.getByRole("table", { name: "Ativos" });

    expect(table).toHaveClass("w-full");
    expect(table).not.toHaveClass("min-w-[64rem]");
    expect(table.parentElement).toHaveClass("w-full", "overflow-x-auto");
  });
});
