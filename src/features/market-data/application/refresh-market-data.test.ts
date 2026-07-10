import { describe, expect, it, vi } from "vitest";

import type { AlertEmailDeliveryRepository } from "@/features/alerts/application/ports";
import { toAlertEmailDeliveryId } from "@/features/alerts/domain/email-delivery";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import { toProfileId } from "@/features/profiles/domain/profile";
import type { SignalRepository } from "@/features/signals/application/ports";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";
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
    const signalRepository = createSignalRepository();
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    const item = createWatchlistItem();
    const snapshots = Array.from({ length: 43 }, (_, index) =>
      createSnapshot(dateFromDayOffset(index), index < 42 ? 100 : 120),
    );
    const recordedSignal = createSignal();
    vi.mocked(watchlistRepository.findByIdForProfile).mockResolvedValue(item);
    vi.mocked(marketDataProvider.fetchDailyPrices).mockResolvedValue(snapshots);
    vi.mocked(signalRepository.upsertMany).mockResolvedValue([recordedSignal]);
    vi.mocked(alertEmailDeliveryRepository.reserve).mockResolvedValue(
      createDelivery(recordedSignal),
    );
    vi.mocked(emailDeliveryProvider.sendBuySignalAlert).mockResolvedValue({
      providerMessageId: "ses-message-1",
    });
    vi.mocked(alertEmailDeliveryRepository.markSent).mockResolvedValue(
      createDelivery(recordedSignal, { status: "SENT" }),
    );

    const result = await refreshMarketDataForWatchlistItem(
      {
        emailAlertsEnabled: true,
        itemId: item.id,
        profileId: item.profileId,
        recipientEmail: "user@example.com",
      },
      {
        alertEmailDeliveryRepository,
        emailDeliveryProvider,
        indicatorSnapshotRepository,
        marketDataProvider,
        priceSnapshotRepository,
        signalRepository,
        watchlistRepository,
      },
    );

    expect(result).toEqual({
      ok: true,
      value: { latestMarketDate: "2026-02-12" },
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
          ema6: 100,
          marketDate: "2026-01-06",
          symbol: "PETR4",
        }),
      ]),
    );
    expect(signalRepository.upsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          marketDate: "2026-02-12",
          profileId: toProfileId("profile-1"),
          reason: "EMA6_CROSSED_ABOVE_EMA42",
          signalType: "BUY",
          symbol: "PETR4",
        }),
      ]),
    );
    expect(emailDeliveryProvider.sendBuySignalAlert).toHaveBeenCalledWith({
      recipientEmail: "user@example.com",
      signal: recordedSignal,
    });
  });

  it("does not fetch provider data when the watchlist item is outside scope", async () => {
    const watchlistRepository = createWatchlistRepository();
    const marketDataProvider = createMarketDataProvider();
    const priceSnapshotRepository = createPriceSnapshotRepository();
    const indicatorSnapshotRepository = createIndicatorSnapshotRepository();
    const signalRepository = createSignalRepository();
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    vi.mocked(watchlistRepository.findByIdForProfile).mockResolvedValue(null);

    const result = await refreshMarketDataForWatchlistItem(
      {
        emailAlertsEnabled: true,
        itemId: toWatchlistItemId("item-1"),
        profileId: toProfileId("profile-1"),
        recipientEmail: "user@example.com",
      },
      {
        alertEmailDeliveryRepository,
        emailDeliveryProvider,
        indicatorSnapshotRepository,
        marketDataProvider,
        priceSnapshotRepository,
        signalRepository,
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
    expect(signalRepository.upsertMany).not.toHaveBeenCalled();
    expect(emailDeliveryProvider.sendBuySignalAlert).not.toHaveBeenCalled();
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
    listForSymbol: vi.fn(),
    upsertMany: vi.fn(),
  };
}

function createIndicatorSnapshotRepository(): IndicatorSnapshotRepository {
  return {
    latestBySymbol: vi.fn(),
    listForSymbol: vi.fn(),
    upsertMany: vi.fn(),
  };
}

function createSignalRepository(): SignalRepository {
  return {
    listForProfile: vi.fn(),
    upsertMany: vi.fn(),
  };
}

function createAlertEmailDeliveryRepository(): AlertEmailDeliveryRepository {
  return {
    createSkipped: vi.fn(),
    markFailed: vi.fn(),
    markSent: vi.fn(),
    reserve: vi.fn(),
  };
}

function createEmailDeliveryProvider() {
  return {
    name: "ses" as const,
    sendBuySignalAlert: vi.fn(),
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

function dateFromDayOffset(dayOffset: number) {
  return new Date(Date.UTC(2026, 0, 1 + dayOffset)).toISOString().slice(0, 10);
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

function createSignal(): Signal {
  return {
    createdAt: new Date("2026-01-03T12:00:00.000Z"),
    id: toSignalId("signal-1"),
    marketDate: "2026-02-12",
    profileId: toProfileId("profile-1"),
    reason: "EMA6_CROSSED_ABOVE_EMA42",
    signalType: "BUY",
    symbol: "PETR4",
  };
}

function createDelivery(
  signal: Signal,
  fields: { status?: "PENDING" | "SENT" } = {},
) {
  return {
    createdAt: new Date("2026-01-03T12:00:00.000Z"),
    id: toAlertEmailDeliveryId("delivery-1"),
    provider: "ses" as const,
    providerError: null,
    providerMessageId: null,
    recipientEmail: "user@example.com",
    sentAt: null,
    signalId: signal.id,
    skippedReason: null,
    status: fields.status ?? "PENDING",
    updatedAt: new Date("2026-01-03T12:00:00.000Z"),
  };
}
