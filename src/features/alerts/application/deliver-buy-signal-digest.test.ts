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
      providerMessageId: "ses-message-1",
    });
    vi.mocked(repository.markSentMany).mockResolvedValue([
      createDelivery(second, { status: "SENT" }),
    ]);

    const result = await deliverBuySignalDigest(
      {
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
      provider: "ses",
      recipientEmail: "user@example.com",
      signalIds: [first.id, second.id],
    });
    expect(provider.sendBuySignalDigest).toHaveBeenCalledWith({
      marketDate: "2026-07-13",
      recipientEmail: "user@example.com",
      signals: [second],
    });
    expect(repository.markSentMany).toHaveBeenCalledWith({
      deliveryIds: [reserved.id],
      providerMessageId: "ses-message-1",
      sentAt: new Date("2026-07-14T11:00:00.000Z"),
    });
    expect(result.type).toBe("sent");
  });

  it("records disabled digest candidates as skipped without calling SES", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const signal = createSignal("signal-1", "PETR4");
    vi.mocked(repository.createSkippedMany).mockResolvedValue([
      createDelivery(signal, { status: "SKIPPED" }),
    ]);

    const result = await deliverBuySignalDigest(
      {
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

  it("marks every reserved delivery failed when SES rejects the digest", async () => {
    const repository = createRepository();
    const provider = createProvider();
    const signal = createSignal("signal-1", "PETR4");
    const reserved = createDelivery(signal);
    vi.mocked(repository.reserveMany).mockResolvedValue([reserved]);
    vi.mocked(provider.sendBuySignalDigest).mockRejectedValue(
      new Error("SES unavailable"),
    );
    vi.mocked(repository.markFailedMany).mockResolvedValue([
      createDelivery(signal, {
        providerError: "SES unavailable",
        status: "FAILED",
      }),
    ]);

    const result = await deliverBuySignalDigest(
      {
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
      providerError: "SES unavailable",
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
    name: "ses",
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

function createDelivery(
  signal: Signal,
  fields: Partial<AlertEmailDelivery> = {},
): AlertEmailDelivery {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toAlertEmailDeliveryId(`delivery-${signal.id}`),
    provider: "ses",
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
