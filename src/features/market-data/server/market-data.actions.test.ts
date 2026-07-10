import { beforeEach, describe, expect, it, vi } from "vitest";

import { toAuthUserId, toProfileId } from "@/features/profiles/domain/profile";

import { refreshWatchlistItemMarketData } from "./market-data.actions";

const createConfiguredEmailDeliveryProviderMock = vi.hoisted(() => vi.fn());
const createDrizzleAlertEmailDeliveryRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleIndicatorSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzlePriceSnapshotRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleSignalRepositoryMock = vi.hoisted(() => vi.fn());
const createDrizzleWatchlistRepositoryMock = vi.hoisted(() => vi.fn());
const createConfiguredMarketDataProviderMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const refreshMarketDataForWatchlistItemMock = vi.hoisted(() => vi.fn());
const requireCurrentProfileMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock(
  "@/features/alerts/infrastructure/drizzle-alert-email-delivery-repository",
  () => ({
    createDrizzleAlertEmailDeliveryRepository:
      createDrizzleAlertEmailDeliveryRepositoryMock,
  }),
);

vi.mock(
  "@/features/alerts/infrastructure/email-delivery-provider-factory",
  () => ({
    createConfiguredEmailDeliveryProvider:
      createConfiguredEmailDeliveryProviderMock,
  }),
);

vi.mock(
  "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository",
  () => ({
    createDrizzleIndicatorSnapshotRepository:
      createDrizzleIndicatorSnapshotRepositoryMock,
  }),
);

vi.mock("@/features/signals/infrastructure/drizzle-signal-repository", () => ({
  createDrizzleSignalRepository: createDrizzleSignalRepositoryMock,
}));

vi.mock(
  "@/features/watchlist/infrastructure/drizzle-watchlist-repository",
  () => ({
    createDrizzleWatchlistRepository: createDrizzleWatchlistRepositoryMock,
  }),
);

vi.mock("../application/refresh-market-data", () => ({
  refreshMarketDataForWatchlistItem: refreshMarketDataForWatchlistItemMock,
}));

vi.mock("../infrastructure/market-data-provider-factory", () => ({
  createConfiguredMarketDataProvider: createConfiguredMarketDataProviderMock,
}));

vi.mock("../infrastructure/drizzle-price-snapshot-repository", () => ({
  createDrizzlePriceSnapshotRepository:
    createDrizzlePriceSnapshotRepositoryMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

describe("market data actions", () => {
  beforeEach(() => {
    createConfiguredEmailDeliveryProviderMock.mockReset();
    createConfiguredEmailDeliveryProviderMock.mockReturnValue({
      type: "email-delivery-provider",
    });
    createConfiguredMarketDataProviderMock.mockReset();
    createConfiguredMarketDataProviderMock.mockReturnValue({
      type: "market-data-provider",
    });
    createDrizzleAlertEmailDeliveryRepositoryMock.mockReset();
    createDrizzleAlertEmailDeliveryRepositoryMock.mockReturnValue({
      type: "alert-email-delivery-repository",
    });
    createDrizzleIndicatorSnapshotRepositoryMock.mockReset();
    createDrizzleIndicatorSnapshotRepositoryMock.mockReturnValue({
      type: "indicator-snapshot-repository",
    });
    createDrizzlePriceSnapshotRepositoryMock.mockReset();
    createDrizzlePriceSnapshotRepositoryMock.mockReturnValue({
      type: "price-snapshot-repository",
    });
    createDrizzleSignalRepositoryMock.mockReset();
    createDrizzleSignalRepositoryMock.mockReturnValue({
      type: "signal-repository",
    });
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      type: "watchlist-repository",
    });
    notFoundMock.mockClear();
    refreshMarketDataForWatchlistItemMock.mockReset();
    refreshMarketDataForWatchlistItemMock.mockResolvedValue({
      ok: true,
      value: { latestMarketDate: "2026-01-02" },
    });
    requireCurrentProfileMock.mockReset();
    requireCurrentProfileMock.mockResolvedValue({
      email: "user@example.com",
      profile: {
        authUserId: toAuthUserId("user-1"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        emailAlertsEnabled: true,
        id: toProfileId("profile-1"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    revalidatePathMock.mockClear();
  });

  it("refreshes market data for the authenticated profile's watchlist item", async () => {
    await refreshWatchlistItemMarketData("item-1");

    expect(refreshMarketDataForWatchlistItemMock).toHaveBeenCalledWith(
      {
        emailAlertsEnabled: true,
        itemId: "item-1",
        profileId: toProfileId("profile-1"),
        recipientEmail: "user@example.com",
      },
      {
        alertEmailDeliveryRepository: {
          type: "alert-email-delivery-repository",
        },
        emailDeliveryProvider: { type: "email-delivery-provider" },
        indicatorSnapshotRepository: { type: "indicator-snapshot-repository" },
        marketDataProvider: { type: "market-data-provider" },
        priceSnapshotRepository: { type: "price-snapshot-repository" },
        signalRepository: { type: "signal-repository" },
        watchlistRepository: { type: "watchlist-repository" },
      },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("revalidates the ticker detail path when submitted from a ticker page", async () => {
    const formData = new FormData();
    formData.set("revalidatePath", "/dashboard/tickers/PETR4");

    await refreshWatchlistItemMarketData("item-1", formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tickers/PETR4");
  });

  it("renders not found for an out-of-scope watchlist item", async () => {
    refreshMarketDataForWatchlistItemMock.mockResolvedValue({
      error: { type: "watchlist_item_not_found" },
      ok: false,
    });

    await expect(refreshWatchlistItemMarketData("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("blocks refresh when no current profile is authenticated", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(refreshWatchlistItemMarketData("item-1")).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(refreshMarketDataForWatchlistItemMock).not.toHaveBeenCalled();
  });
});
