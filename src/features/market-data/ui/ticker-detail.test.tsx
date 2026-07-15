import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";

import { TickerDetail } from "./ticker-detail";

const candlestickChartMock = vi.hoisted(() =>
  vi.fn(({ snapshots }: { snapshots: Array<Record<string, unknown>> }) => {
    void snapshots;
    return null;
  }),
);
const emaChartMock = vi.hoisted(() =>
  vi.fn(({ snapshots }: { snapshots: Array<Record<string, unknown>> }) => {
    void snapshots;
    return null;
  }),
);

vi.mock("./ticker-charts", () => ({
  CandlestickChart: candlestickChartMock,
  EmaChart: emaChartMock,
}));

describe("TickerDetail", () => {
  it("sends only the latest 60 lightweight points to client charts", () => {
    const indicatorSnapshots = Array.from({ length: 61 }, (_, index) =>
      createIndicatorSnapshot(index),
    );
    const priceSnapshots = Array.from({ length: 61 }, (_, index) =>
      createPriceSnapshot(index),
    );

    render(
      <TickerDetail
        indicatorSnapshots={indicatorSnapshots}
        priceSnapshots={priceSnapshots}
      />,
    );

    expect(emaChartMock).toHaveBeenCalled();
    expect(candlestickChartMock).toHaveBeenCalled();
    const emaPoints = emaChartMock.mock.calls.at(-1)![0].snapshots;
    const pricePoints = candlestickChartMock.mock.calls.at(-1)![0].snapshots;

    expect(emaPoints).toHaveLength(60);
    expect(pricePoints).toHaveLength(60);
    expect(emaPoints[0].marketDate).toBe("2026-01-02");
    expect(pricePoints[0].marketDate).toBe("2026-01-02");
    expect(pricePoints[0]).toEqual({
      close: 1,
      high: 2,
      low: 0,
      marketDate: "2026-01-02",
      open: 0.5,
    });
    expect(pricePoints[0]).not.toHaveProperty("rawPayload");
    expect(pricePoints[0]).not.toHaveProperty("fetchedAt");
  });
});

function createIndicatorSnapshot(index: number): IndicatorSnapshot {
  return {
    close: index,
    ema6: index,
    ema13: index,
    ema42: index,
    marketDate: marketDate(index),
    source: "brapi",
    symbol: "PETR4",
  };
}

function createPriceSnapshot(index: number): PriceSnapshot {
  return {
    adjustedClose: index,
    close: index,
    currency: "BRL",
    fetchedAt: new Date("2026-01-01T12:00:00.000Z"),
    high: index + 1,
    low: index - 1,
    marketDate: marketDate(index),
    open: index - 0.5,
    rawPayload: { oversized: "provider payload" },
    source: "brapi",
    symbol: "PETR4",
    volume: 1_000,
  };
}

function marketDate(index: number) {
  const date = new Date("2026-01-01T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}
