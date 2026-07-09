import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";

import type { SignalRepository } from "./ports";
import { listSignalsForProfile, recordSignals } from "./manage-signals";

describe("signal use cases", () => {
  it("records detected signals through the repository", async () => {
    const signalRepository = createSignalRepository();
    const signal = {
      marketDate: "2026-01-02",
      profileId: toProfileId("profile-1"),
      reason: "EMA6_CROSSED_ABOVE_EMA42" as const,
      signalType: "BUY" as const,
      symbol: "PETR4",
    };
    vi.mocked(signalRepository.upsertMany).mockResolvedValue([]);

    await recordSignals({ signals: [signal] }, { signalRepository });

    expect(signalRepository.upsertMany).toHaveBeenCalledWith([signal]);
  });

  it("lists signals for the current profile scope", async () => {
    const signalRepository = createSignalRepository();
    const profileId = toProfileId("profile-1");
    vi.mocked(signalRepository.listForProfile).mockResolvedValue([]);

    await listSignalsForProfile({ profileId }, { signalRepository });

    expect(signalRepository.listForProfile).toHaveBeenCalledWith(profileId);
  });
});

function createSignalRepository(): SignalRepository {
  return {
    listForProfile: vi.fn(),
    upsertMany: vi.fn(),
  };
}
