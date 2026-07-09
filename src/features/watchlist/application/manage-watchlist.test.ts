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
import type { WatchlistRepository } from "./ports";

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
    const repository = createRepository();
    const profileId = toProfileId("profile-1");
    vi.mocked(repository.findBySymbol).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(createItem());

    const result = await createWatchlistItemForProfile(
      {
        displayName: null,
        notes: null,
        profileId,
        symbol: "PETR4",
      },
      { watchlistRepository: repository },
    );

    expect(result.ok).toBe(true);
    expect(repository.findBySymbol).toHaveBeenCalledWith({
      profileId,
      symbol: "PETR4",
    });
    expect(repository.create).toHaveBeenCalledWith({
      displayName: null,
      notes: null,
      profileId,
      symbol: "PETR4",
    });
  });

  it("does not create a duplicate symbol for the same profile", async () => {
    const repository = createRepository();
    vi.mocked(repository.findBySymbol).mockResolvedValue(createItem());

    const result = await createWatchlistItemForProfile(
      {
        displayName: null,
        notes: null,
        profileId: toProfileId("profile-1"),
        symbol: "PETR4",
      },
      { watchlistRepository: repository },
    );

    expect(result).toEqual({ error: { type: "duplicate_symbol" }, ok: false });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("returns a duplicate result when the insert hits an atomic conflict", async () => {
    const repository = createRepository();
    vi.mocked(repository.findBySymbol).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(null);

    const result = await createWatchlistItemForProfile(
      {
        displayName: null,
        notes: null,
        profileId: toProfileId("profile-1"),
        symbol: "PETR4",
      },
      { watchlistRepository: repository },
    );

    expect(result).toEqual({ error: { type: "duplicate_symbol" }, ok: false });
  });

  it("scopes updates and duplicate checks by profile and item", async () => {
    const repository = createRepository();
    const item = createItem();
    vi.mocked(repository.findBySymbol).mockResolvedValue(null);
    vi.mocked(repository.update).mockResolvedValue(item);

    await updateWatchlistItemForProfile(
      {
        displayName: "Petrobras",
        itemId: item.id,
        notes: null,
        profileId: item.profileId,
        symbol: "PETR4",
      },
      { watchlistRepository: repository },
    );

    expect(repository.findBySymbol).toHaveBeenCalledWith({
      excludeItemId: item.id,
      profileId: item.profileId,
      symbol: "PETR4",
    });
    expect(repository.update).toHaveBeenCalledWith({
      displayName: "Petrobras",
      itemId: item.id,
      notes: null,
      profileId: item.profileId,
      symbol: "PETR4",
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

function createItem(): WatchlistItem {
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
