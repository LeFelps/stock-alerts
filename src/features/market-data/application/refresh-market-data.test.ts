import { describe, expect, it, vi } from "vitest";

import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import { toProfileId } from "@/features/profiles/domain/profile";
import type { WatchlistRepository } from "@/features/watchlist/application/ports";
import {
  toWatchlistItemId,
  type WatchlistItem,
} from "@/features/watchlist/domain/watchlist-item";

import type { MarketDataProvider, PriceSnapshotRepository } from "./ports";
import {
  listLatestMarketDataDatesForSymbols,
  refreshMarketDataForWatchlistItem,
} from "./refresh-market-data";

describe("market data refresh use cases", () => {
  it("fetches and stores daily prices for an owned watchlist item", async () => {
    const watchlistRepository = createWatchlistRepository();
    const marketDataProvider = createMarketDataProvider();
    const priceSnapshotRepository = createPriceSnapshotRepository();
    const indicatorSnapshotRepository = createIndicatorSnapshotRepository();
    const item = createWatchlistItem();
    const snapshots = Array.from({ length: 6 }, (_, index) =>
      createSnapshot(`2026-01-0${index + 1}`, index + 1),
    );
    vi.mocked(watchlistRepository.findByIdForProfile).mockResolvedValue(item);
    vi.mocked(marketDataProvider.fetchDailyPrices).mockResolvedValue(snapshots);

    const result = await refreshMarketDataForWatchlistItem(
      { itemId: item.id, profileId: item.profileId },
      {
        indicatorSnapshotRepository,
        marketDataProvider,
        priceSnapshotRepository,
        watchlistRepository,
      },
    );

    expect(result).toEqual({
      ok: true,
      value: { latestMarketDate: "2026-01-06" },
    });
    expect(watchlistRepository.findByIdForProfile).toHaveBeenCalledWith({
      itemId: item.id,
      profileId: item.profileId,
    });
    expect(marketDataProvider.fetchDailyPrices).toHaveBeenCalledWith("PETR4");
    expect(priceSnapshotRepository.upsertMany).toHaveBeenCalledWith(snapshots);
    expect(indicatorSnapshotRepository.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          ema6: 3.5,
          marketDate: "2026-01-06",
          symbol: "PETR4",
        }),
      ]),
    );
  });

  it("does not fetch provider data when the watchlist item is outside scope", async () => {
    const watchlistRepository = createWatchlistRepository();
    const marketDataProvider = createMarketDataProvider();
    const priceSnapshotRepository = createPriceSnapshotRepository();
    const indicatorSnapshotRepository = createIndicatorSnapshotRepository();
    vi.mocked(watchlistRepository.findByIdForProfile).mockResolvedValue(null);

    const result = await refreshMarketDataForWatchlistItem(
      {
        itemId: toWatchlistItemId("item-1"),
        profileId: toProfileId("profile-1"),
      },
      {
        indicatorSnapshotRepository,
        marketDataProvider,
        priceSnapshotRepository,
        watchlistRepository,
      },
    );

    expect(result).toEqual({
      error: { type: "watchlist_item_not_found" },
      ok: false,
    });
    expect(marketDataProvider.fetchDailyPrices).not.toHaveBeenCalled();
    expect(priceSnapshotRepository.upsertMany).not.toHaveBeenCalled();
    expect(indicatorSnapshotRepository.upsertMany).not.toHaveBeenCalled();
  });

  it("loads latest market dates for unique symbols", async () => {
    const priceSnapshotRepository = createPriceSnapshotRepository();
    const latestDates = new Map([["PETR4", "2026-01-03"]]);
    vi.mocked(
      priceSnapshotRepository.latestMarketDatesBySymbol,
    ).mockResolvedValue(latestDates);

    const result = await listLatestMarketDataDatesForSymbols(
      { symbols: ["PETR4", "PETR4"] },
      { priceSnapshotRepository },
    );

    expect(result).toBe(latestDates);
    expect(
      priceSnapshotRepository.latestMarketDatesBySymbol,
    ).toHaveBeenCalledWith(["PETR4"]);
  });
});

function createWatchlistRepository(): WatchlistRepository {
  return {
    create: vi.fn(),
    delete: vi.fn(),
    findByIdForProfile: vi.fn(),
    findBySymbol: vi.fn(),
    listForProfile: vi.fn(),
    setEnabled: vi.fn(),
    update: vi.fn(),
  };
}

function createMarketDataProvider(): MarketDataProvider {
  return {
    fetchDailyPrices: vi.fn(),
  };
}

function createPriceSnapshotRepository(): PriceSnapshotRepository {
  return {
    latestMarketDatesBySymbol: vi.fn(),
    upsertMany: vi.fn(),
  };
}

function createIndicatorSnapshotRepository(): IndicatorSnapshotRepository {
  return {
    upsertMany: vi.fn(),
  };
}

function createWatchlistItem(): WatchlistItem {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayName: null,
    enabled: true,
    id: toWatchlistItemId("item-1"),
    notes: null,
    profileId: toProfileId("profile-1"),
    symbol: "PETR4",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function createSnapshot(marketDate: string, close = 10) {
  return {
    adjustedClose: close,
    close,
    currency: "BRL",
    fetchedAt: new Date("2026-01-03T12:00:00.000Z"),
    high: close + 1,
    low: close - 1,
    marketDate,
    open: close - 0.5,
    rawPayload: {},
    source: "brapi" as const,
    symbol: "PETR4",
    volume: 1000,
  };
}
