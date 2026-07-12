import { beforeEach, describe, expect, it, vi } from "vitest";

import { toAuthUserId, toProfileId } from "@/features/profiles/domain/profile";

import {
  createWatchlistItem,
  deleteWatchlistItem,
  setWatchlistItemEnabled,
  updateWatchlistItem,
} from "./watchlist.actions";

const createDrizzleWatchlistRepositoryMock = vi.hoisted(() => vi.fn());
const createWatchlistItemForProfileMock = vi.hoisted(() => vi.fn());
const deleteWatchlistItemForProfileMock = vi.hoisted(() => vi.fn());
const findByIdForProfileMock = vi.hoisted(() => vi.fn());
const requireCurrentProfileMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const setWatchlistItemEnabledForProfileMock = vi.hoisted(() => vi.fn());
const updateWatchlistItemForProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireCurrentProfile: requireCurrentProfileMock,
}));

vi.mock("../application/manage-watchlist", () => ({
  createWatchlistItemForProfile: createWatchlistItemForProfileMock,
  deleteWatchlistItemForProfile: deleteWatchlistItemForProfileMock,
  setWatchlistItemEnabledForProfile: setWatchlistItemEnabledForProfileMock,
  updateWatchlistItemForProfile: updateWatchlistItemForProfileMock,
}));

vi.mock("../infrastructure/drizzle-watchlist-repository", () => ({
  createDrizzleWatchlistRepository: createDrizzleWatchlistRepositoryMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("watchlist actions", () => {
  beforeEach(() => {
    createDrizzleWatchlistRepositoryMock.mockReset();
    createDrizzleWatchlistRepositoryMock.mockReturnValue({
      findByIdForProfile: findByIdForProfileMock,
      type: "watchlist-repository",
    });
    findByIdForProfileMock.mockReset();
    findByIdForProfileMock.mockResolvedValue(createItem("PETR4"));
    createWatchlistItemForProfileMock.mockReset();
    createWatchlistItemForProfileMock.mockResolvedValue({
      ok: true,
      value: createItem("PETR4"),
    });
    deleteWatchlistItemForProfileMock.mockReset();
    deleteWatchlistItemForProfileMock.mockResolvedValue({
      ok: true,
      value: undefined,
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
    setWatchlistItemEnabledForProfileMock.mockReset();
    setWatchlistItemEnabledForProfileMock.mockResolvedValue({
      ok: true,
      value: createItem("PETR4"),
    });
    updateWatchlistItemForProfileMock.mockReset();
    updateWatchlistItemForProfileMock.mockResolvedValue({
      ok: true,
      value: createItem("VALE3"),
    });
  });

  it("creates a normalized item for the authenticated profile", async () => {
    const formData = createFormData(" pe tr4 ");
    formData.set("userId", "attacker-user");

    await createWatchlistItem(formData);

    expect(createWatchlistItemForProfileMock).toHaveBeenCalledWith(
      {
        displayName: "Petrobras",
        notes: "Longo prazo",
        profileId: toProfileId("profile-1"),
        symbol: "PETR4",
      },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("does not revalidate when creation finds a duplicate", async () => {
    createWatchlistItemForProfileMock.mockResolvedValue({
      error: { type: "duplicate_symbol" },
      ok: false,
    });

    await createWatchlistItem(createFormData("PETR4"));

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("passes item and profile ownership to update", async () => {
    await updateWatchlistItem("item-1", createFormData("VALE3"));

    expect(updateWatchlistItemForProfileMock).toHaveBeenCalledWith(
      {
        displayName: "Petrobras",
        itemId: "item-1",
        notes: "Longo prazo",
        profileId: toProfileId("profile-1"),
        symbol: "VALE3",
      },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("passes item and profile ownership to enable and delete", async () => {
    await setWatchlistItemEnabled("item-1", false);
    await deleteWatchlistItem("item-1");

    expect(setWatchlistItemEnabledForProfileMock).toHaveBeenCalledWith(
      {
        enabled: false,
        itemId: "item-1",
        profileId: toProfileId("profile-1"),
      },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
    expect(deleteWatchlistItemForProfileMock).toHaveBeenCalledWith(
      {
        itemId: "item-1",
        profileId: toProfileId("profile-1"),
      },
      {
        watchlistRepository: expect.objectContaining({
          type: "watchlist-repository",
        }),
      },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("returns not found when an owned mutation target is missing", async () => {
    deleteWatchlistItemForProfileMock.mockResolvedValue({
      error: { type: "watchlist_item_not_found" },
      ok: false,
    });

    await expect(deleteWatchlistItem("missing-item")).resolves.toEqual({
      error: "not_found",
      status: "error",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("blocks every mutation when no current profile is authenticated", async () => {
    requireCurrentProfileMock.mockRejectedValue(new Error("NEXT_REDIRECT:/"));

    await expect(createWatchlistItem(createFormData("PETR4"))).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );
    await expect(
      updateWatchlistItem("item-1", createFormData("PETR4")),
    ).rejects.toThrow("NEXT_REDIRECT:/");
    await expect(setWatchlistItemEnabled("item-1", false)).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );
    await expect(deleteWatchlistItem("item-1")).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(createWatchlistItemForProfileMock).not.toHaveBeenCalled();
    expect(updateWatchlistItemForProfileMock).not.toHaveBeenCalled();
    expect(setWatchlistItemEnabledForProfileMock).not.toHaveBeenCalled();
    expect(deleteWatchlistItemForProfileMock).not.toHaveBeenCalled();
  });
});

function createFormData(symbol: string) {
  const formData = new FormData();
  formData.set("displayName", "Petrobras");
  formData.set("notes", "Longo prazo");
  formData.set("symbol", symbol);
  return formData;
}

function createItem(symbol: string) {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    displayName: "Petrobras",
    enabled: true,
    id: "item-1",
    notes: "Longo prazo",
    profileId: toProfileId("profile-1"),
    symbol,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
