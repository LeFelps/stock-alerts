import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";

import {
  toWatchlistItemId,
  type WatchlistItem,
} from "../domain/watchlist-item";
import {
  createWatchlistItemForProfile,
  deleteWatchlistItemForProfile,
  listWatchlistItemsForProfile,
  setWatchlistItemEnabledForProfile,
  updateWatchlistItemForProfile,
} from "./manage-watchlist";
import type { AssetCatalogProvider, WatchlistRepository } from "./ports";

describe("watchlist use cases", () => {
  it("lists only through the current profile scope", async () => {
    const repository = createRepository();
    const profileId = toProfileId("profile-1");
    vi.mocked(repository.listForProfile).mockResolvedValue([createItem()]);

    const result = await listWatchlistItemsForProfile(
      { profileId },
      { watchlistRepository: repository },
    );

    expect(result).toEqual([createItem()]);
    expect(repository.listForProfile).toHaveBeenCalledWith(profileId);
  });

  it("creates an item when its symbol is unique for the profile", async () => {
    const assetCatalogProvider = createAssetCatalogProvider();
    const repository = createRepository();
    const profileId = toProfileId("profile-1");
    vi.mocked(repository.findBySymbol).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(createItem());

    const result = await createWatchlistItemForProfile(
      {
        notes: null,
        profileId,
        symbol: "PETR4",
      },
      { assetCatalogProvider, watchlistRepository: repository },
    );

    expect(result.ok).toBe(true);
    expect(repository.findBySymbol).toHaveBeenCalledWith({
      profileId,
      symbol: "PETR4",
    });
    expect(repository.create).toHaveBeenCalledWith({
      notes: null,
      profileId,
      longName: "PETROBRAS PN",
      logoUrl: null,
      symbol: "PETR4",
    });
  });

  it("does not create a duplicate symbol for the same profile", async () => {
    const assetCatalogProvider = createAssetCatalogProvider({
      longName: "NOVO PN",
      logoUrl: null,
      symbol: "NEW3",
    });
    const repository = createRepository();
    vi.mocked(repository.findBySymbol).mockResolvedValue(createItem());

    const result = await createWatchlistItemForProfile(
      {
        notes: null,
        profileId: toProfileId("profile-1"),
        symbol: "OLD3",
      },
      { assetCatalogProvider, watchlistRepository: repository },
    );

    expect(result).toEqual({ error: { type: "duplicate_symbol" }, ok: false });
    expect(repository.findBySymbol).toHaveBeenCalledWith({
      profileId: toProfileId("profile-1"),
      symbol: "NEW3",
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("returns a duplicate result when the insert hits an atomic conflict", async () => {
    const assetCatalogProvider = createAssetCatalogProvider();
    const repository = createRepository();
    vi.mocked(repository.findBySymbol).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(null);

    const result = await createWatchlistItemForProfile(
      {
        notes: null,
        profileId: toProfileId("profile-1"),
        symbol: "PETR4",
      },
      { assetCatalogProvider, watchlistRepository: repository },
    );

    expect(result).toEqual({ error: { type: "duplicate_symbol" }, ok: false });
  });

  it.each(["invalid", "unavailable"] as const)(
    "does not query or write when symbol resolution is %s",
    async (status) => {
      const assetCatalogProvider: AssetCatalogProvider = {
        resolveSymbol: vi.fn().mockResolvedValue({ status }),
      };
      const repository = createRepository();

      const result = await createWatchlistItemForProfile(
        {
          notes: null,
          profileId: toProfileId("profile-1"),
          symbol: "FAKE4",
        },
        { assetCatalogProvider, watchlistRepository: repository },
      );

      expect(result).toEqual({
        error: {
          type: status === "invalid" ? "invalid_symbol" : "provider_error",
        },
        ok: false,
      });
      expect(repository.findBySymbol).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it("updates only notes for the owned item", async () => {
    const repository = createRepository();
    const item = createItem();
    vi.mocked(repository.update).mockResolvedValue(item);

    await updateWatchlistItemForProfile(
      {
        itemId: item.id,
        notes: null,
        profileId: item.profileId,
      },
      { watchlistRepository: repository },
    );

    expect(repository.update).toHaveBeenCalledWith({
      itemId: item.id,
      notes: null,
      profileId: item.profileId,
    });
  });

  it("scopes enable and delete mutations by profile and item", async () => {
    const repository = createRepository();
    const item = createItem();
    vi.mocked(repository.setEnabled).mockResolvedValue(item);
    vi.mocked(repository.delete).mockResolvedValue(true);

    await setWatchlistItemEnabledForProfile(
      { enabled: false, itemId: item.id, profileId: item.profileId },
      { watchlistRepository: repository },
    );
    await deleteWatchlistItemForProfile(
      { itemId: item.id, profileId: item.profileId },
      { watchlistRepository: repository },
    );

    expect(repository.setEnabled).toHaveBeenCalledWith({
      enabled: false,
      itemId: item.id,
      profileId: item.profileId,
    });
    expect(repository.delete).toHaveBeenCalledWith({
      itemId: item.id,
      profileId: item.profileId,
    });
  });
});

function createRepository(): WatchlistRepository {
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

function createAssetCatalogProvider(
  asset = { logoUrl: null, longName: "PETROBRAS PN", symbol: "PETR4" },
): AssetCatalogProvider {
  return {
    resolveSymbol: vi.fn().mockResolvedValue({ asset, status: "resolved" }),
  };
}

function createItem(): WatchlistItem {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    longName: null,
    logoUrl: null,
    enabled: true,
    id: toWatchlistItemId("item-1"),
    notes: null,
    profileId: toProfileId("profile-1"),
    symbol: "PETR4",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
