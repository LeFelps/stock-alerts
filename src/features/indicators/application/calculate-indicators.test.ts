import { describe, expect, it } from "vitest";

import {
  calculateEMA,
  calculateIndicators,
  calculateIndicatorSnapshotsFromPrices,
} from "./calculate-indicators";

describe("indicator calculations", () => {
  it("seeds MME6 with SMA and returns null until enough prices exist", () => {
    expect(calculateEMA([1, 2, 3, 4, 5], 6)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(calculateEMA([1, 2, 3, 4, 5, 6, 7], 6)).toEqual([
      null,
      null,
      null,
      null,
      null,
      3.5,
      4.5,
    ]);
  });

  it("calculates aligned MME6, MME13, and MME42 daily rows", () => {
    const rows = calculateIndicators(createRows(43));

    expect(rows[5]).toMatchObject({ ema6: 3.5, marketDate: "2026-01-06" });
    expect(rows[12]).toMatchObject({ ema13: 7, marketDate: "2026-01-13" });
    expect(rows[41]).toMatchObject({ ema42: 21.5, marketDate: "2026-02-11" });
    expect(rows[42]?.marketDate).toBe("2026-02-12");
    expect(rows[42]?.ema6).toBeCloseTo(40.5);
    expect(rows[42]?.ema13).toBeCloseTo(37);
    expect(rows[42]?.ema42).toBeCloseTo(22.5);
  });

  it("sorts input by market date before calculating indicators", () => {
    const [first, second, third, fourth, fifth, sixth] = calculateIndicators([
      { close: 6, marketDate: "2026-01-06" },
      { close: 1, marketDate: "2026-01-01" },
      { close: 4, marketDate: "2026-01-04" },
      { close: 2, marketDate: "2026-01-02" },
      { close: 5, marketDate: "2026-01-05" },
      { close: 3, marketDate: "2026-01-03" },
    ]);

    expect(first?.marketDate).toBe("2026-01-01");
    expect(second?.marketDate).toBe("2026-01-02");
    expect(third?.marketDate).toBe("2026-01-03");
    expect(fourth?.marketDate).toBe("2026-01-04");
    expect(fifth?.marketDate).toBe("2026-01-05");
    expect(sixth).toMatchObject({ ema6: 3.5, marketDate: "2026-01-06" });
  });

  it("maps refreshed price snapshots into persisted indicator snapshots", () => {
    const snapshots = calculateIndicatorSnapshotsFromPrices(
      createRows(6).map((row) => ({
        adjustedClose: row.close,
        close: row.close,
        currency: "BRL",
        fetchedAt: new Date("2026-01-06T12:00:00.000Z"),
        high: row.close,
        low: row.close,
        marketDate: row.marketDate,
        open: row.close,
        rawPayload: {},
        source: "brapi" as const,
        symbol: "PETR4",
        volume: 1000,
      })),
    );

    expect(snapshots.at(-1)).toEqual({
      close: 6,
      ema6: 3.5,
      ema13: null,
      ema42: null,
      marketDate: "2026-01-06",
      source: "brapi",
      symbol: "PETR4",
    });
  });
});

function createRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    close: index + 1,
    marketDate: dateFromDayOffset(index),
  }));
}

function dateFromDayOffset(dayOffset: number) {
  return new Date(Date.UTC(2026, 0, 1 + dayOffset)).toISOString().slice(0, 10);
}
