import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import {
  toAlertEmailDeliveryId,
  type AlertEmailDelivery,
} from "../domain/email-delivery";
import { deliverBuySignalDigest } from "./deliver-buy-signal-digest";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "./ports";

describe("deliverBuySignalDigest", () => {
  it("sends one digest containing only newly reserved signals", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const first = createSignal("signal-1", "PETR4");
    const second = createSignal("signal-2", "VALE3");
    const reserved = createDelivery(second);
    vi.mocked(repository.reserveMany).mockResolvedValue([reserved]);
    vi.mocked(provider.sendBuySignalDigest).mockResolvedValue({
      providerMessageId: "resend-message-1",
    });
    vi.mocked(repository.markSentMany).mockResolvedValue([
      createDelivery(second, { status: "SENT" }),
    ]);

    const result = await deliverBuySignalDigest(
      {
        assets: [createAsset("PETR4"), createAsset("VALE3")],
        emailAlertsEnabled: true,
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [first, second],
      },
      {
        alertEmailDeliveryRepository: repository,
        emailDeliveryProvider: provider,
        now: () => new Date("2026-07-14T11:00:00.000Z"),
      },
    );

    expect(repository.reserveMany).toHaveBeenCalledWith({
      provider: "resend",
      recipientEmail: "user@example.com",
      signalIds: [first.id, second.id],
    });
    expect(provider.sendBuySignalDigest).toHaveBeenCalledWith({
      assets: [createAsset("VALE3")],
      marketDate: "2026-07-13",
      recipientEmail: "user@example.com",
      signals: [second],
    });
    expect(repository.markSentMany).toHaveBeenCalledWith({
      deliveryIds: [reserved.id],
      providerMessageId: "resend-message-1",
      sentAt: new Date("2026-07-14T11:00:00.000Z"),
    });
    expect(result.type).toBe("sent");
  });

  it("records disabled digest candidates as skipped without calling Resend", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const signal = createSignal("signal-1", "PETR4");
    vi.mocked(repository.createSkippedMany).mockResolvedValue([
      createDelivery(signal, { status: "SKIPPED" }),
    ]);

    const result = await deliverBuySignalDigest(
      {
        assets: [createAsset("PETR4")],
        emailAlertsEnabled: false,
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      {
        alertEmailDeliveryRepository: repository,
        emailDeliveryProvider: provider,
      },
    );

    expect(repository.createSkippedMany).toHaveBeenCalledWith({
      recipientEmail: "user@example.com",
      signalIds: [signal.id],
      skippedReason: "EMAIL_ALERTS_DISABLED",
    });
    expect(provider.sendBuySignalDigest).not.toHaveBeenCalled();
    expect(result.type).toBe("skipped");
  });

  it("marks every reserved delivery failed when Resend rejects the digest", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const signal = createSignal("signal-1", "PETR4");
    const reserved = createDelivery(signal);
    vi.mocked(repository.reserveMany).mockResolvedValue([reserved]);
    vi.mocked(provider.sendBuySignalDigest).mockRejectedValue(
      new Error("Resend unavailable"),
    );
    vi.mocked(repository.markFailedMany).mockResolvedValue([
      createDelivery(signal, {
        providerError: "Resend unavailable",
        status: "FAILED",
      }),
    ]);

    const result = await deliverBuySignalDigest(
      {
        assets: [createAsset("PETR4")],
        emailAlertsEnabled: true,
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      {
        alertEmailDeliveryRepository: repository,
        emailDeliveryProvider: provider,
      },
    );

    expect(repository.markFailedMany).toHaveBeenCalledWith({
      deliveryIds: [reserved.id],
      providerError: "Resend unavailable",
    });
    expect(result.type).toBe("failed");
  });

  it("does not send when all signal deliveries already exist", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const signal = createSignal("signal-1", "PETR4");
    vi.mocked(repository.reserveMany).mockResolvedValue([]);

    const result = await deliverBuySignalDigest(
      {
        assets: [createAsset("PETR4")],
        emailAlertsEnabled: true,
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      {
        alertEmailDeliveryRepository: repository,
        emailDeliveryProvider: provider,
      },
    );

    expect(result).toEqual({ deliveries: [], type: "duplicate" });
    expect(provider.sendBuySignalDigest).not.toHaveBeenCalled();
  });

  it("rejects a digest containing another market date", async () => {
    const repository = createRepository();
    const provider = createProvider();

    await expect(
      deliverBuySignalDigest(
        {
          assets: [createAsset("PETR4")],
          emailAlertsEnabled: true,
          marketDate: "2026-07-14",
          recipientEmail: "user@example.com",
          signals: [createSignal("signal-1", "PETR4")],
        },
        {
          alertEmailDeliveryRepository: repository,
          emailDeliveryProvider: provider,
        },
      ),
    ).rejects.toThrow("another market date");
  });

  it("rejects a digest without display data for every signaled Ativo", async () => {
    const repository = createRepository();
    const provider = createProvider();

    await expect(
      deliverBuySignalDigest(
        {
          assets: [],
          emailAlertsEnabled: true,
          marketDate: "2026-07-13",
          recipientEmail: "user@example.com",
          signals: [createSignal("signal-1", "PETR4")],
        },
        {
          alertEmailDeliveryRepository: repository,
          emailDeliveryProvider: provider,
        },
      ),
    ).rejects.toThrow("missing asset data for PETR4");

    expect(repository.reserveMany).not.toHaveBeenCalled();
  });
});

function createRepository(): AlertEmailDeliveryRepository {
  return {
    createSkippedMany: vi.fn(),
    markFailedMany: vi.fn(),
    markSentMany: vi.fn(),
    reserveMany: vi.fn(),
  };
}

function createProvider(): EmailDeliveryProvider {
  return {
    name: "resend",
    sendBuySignalDigest: vi.fn(),
  };
}

function createSignal(id: string, symbol: string): Signal {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toSignalId(id),
    marketDate: "2026-07-13",
    profileId: toProfileId("profile-1"),
    reason: "EMA6_CROSSED_ABOVE_EMA42",
    signalType: "BUY",
    symbol,
  };
}

function createAsset(symbol: string) {
  return {
    currency: "BRL",
    currentPrice: symbol === "PETR4" ? 32.5 : 61.25,
    logoUrl: `https://icons.brapi.dev/icons/${symbol}.svg`,
    longName: symbol === "PETR4" ? "Petrobras" : "Vale",
    symbol,
  };
}

function createDelivery(
  signal: Signal,
  fields: Partial<AlertEmailDelivery> = {},
): AlertEmailDelivery {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toAlertEmailDeliveryId(`delivery-${signal.id}`),
    provider: "resend",
    providerError: null,
    providerMessageId: null,
    recipientEmail: "user@example.com",
    sentAt: null,
    signalId: signal.id,
    skippedReason: null,
    status: "PENDING",
    updatedAt: new Date("2026-07-14T11:00:00.000Z"),
    ...fields,
  };
}
