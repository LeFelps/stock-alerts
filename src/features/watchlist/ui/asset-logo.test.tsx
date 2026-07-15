import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssetLogo } from "./asset-logo";

describe("AssetLogo", () => {
  it("renders a fallback icon when the asset has no logo", () => {
    render(<AssetLogo item={{ logoUrl: null, symbol: "PETR4" }} />);

    expect(
      screen.getByRole("img", { name: "Logo padrão de PETR4" }),
    ).toBeInTheDocument();
  });

  it("replaces a logo that fails to load with the fallback icon", () => {
    render(
      <AssetLogo
        item={{ logoUrl: "https://example.com/missing.svg", symbol: "VALE3" }}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Logo de VALE3" }));

    expect(
      screen.getByRole("img", { name: "Logo padrão de VALE3" }),
    ).toBeInTheDocument();
  });
});
