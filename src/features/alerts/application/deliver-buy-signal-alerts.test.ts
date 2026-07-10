import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import {
  toAlertEmailDeliveryId,
  type AlertEmailDelivery,
} from "../domain/email-delivery";
import { deliverBuySignalAlerts } from "./deliver-buy-signal-alerts";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "./ports";

describe("deliverBuySignalAlerts", () => {
  it("sends newly recorded BUY signals to the auth email and marks delivery as sent", async () => {
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    const signal = createSignal();
    const reservedDelivery = createDelivery({ signal });
    const sentDelivery = createDelivery({
      providerMessageId: "ses-message-1",
      sentAt: new Date("2026-01-02T12:00:00.000Z"),
      signal,
      status: "SENT",
    });
    vi.mocked(alertEmailDeliveryRepository.reserve).mockResolvedValue(
      reservedDelivery,
    );
    vi.mocked(emailDeliveryProvider.sendBuySignalAlert).mockResolvedValue({
      providerMessageId: "ses-message-1",
    });
    vi.mocked(alertEmailDeliveryRepository.markSent).mockResolvedValue(
      sentDelivery,
    );

    const result = await deliverBuySignalAlerts(
      {
        emailAlertsEnabled: true,
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      {
        alertEmailDeliveryRepository,
        emailDeliveryProvider,
        now: () => new Date("2026-01-02T12:00:00.000Z"),
      },
    );

    expect(alertEmailDeliveryRepository.reserve).toHaveBeenCalledWith({
      provider: "ses",
      recipientEmail: "user@example.com",
      signalId: signal.id,
    });
    expect(emailDeliveryProvider.sendBuySignalAlert).toHaveBeenCalledWith({
      recipientEmail: "user@example.com",
      signal,
    });
    expect(alertEmailDeliveryRepository.markSent).toHaveBeenCalledWith({
      deliveryId: reservedDelivery.id,
      providerMessageId: "ses-message-1",
      sentAt: new Date("2026-01-02T12:00:00.000Z"),
    });
    expect(result).toEqual([{ delivery: sentDelivery, signal, type: "sent" }]);
  });

  it("records a skipped delivery and does not send when email alerts are disabled", async () => {
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    const signal = createSignal();
    const skippedDelivery = createDelivery({
      signal,
      skippedReason: "EMAIL_ALERTS_DISABLED",
      status: "SKIPPED",
    });
    vi.mocked(alertEmailDeliveryRepository.createSkipped).mockResolvedValue(
      skippedDelivery,
    );

    const result = await deliverBuySignalAlerts(
      {
        emailAlertsEnabled: false,
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      { alertEmailDeliveryRepository, emailDeliveryProvider },
    );

    expect(alertEmailDeliveryRepository.createSkipped).toHaveBeenCalledWith({
      recipientEmail: "user@example.com",
      signalId: signal.id,
      skippedReason: "EMAIL_ALERTS_DISABLED",
    });
    expect(emailDeliveryProvider.sendBuySignalAlert).not.toHaveBeenCalled();
    expect(result).toEqual([
      { delivery: skippedDelivery, signal, type: "skipped" },
    ]);
  });

  it("marks reserved deliveries as failed when the provider send fails", async () => {
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    const signal = createSignal();
    const reservedDelivery = createDelivery({ signal });
    const failedDelivery = createDelivery({
      providerError: "SES rejected recipient",
      signal,
      status: "FAILED",
    });
    vi.mocked(alertEmailDeliveryRepository.reserve).mockResolvedValue(
      reservedDelivery,
    );
    vi.mocked(emailDeliveryProvider.sendBuySignalAlert).mockRejectedValue(
      new Error("SES rejected recipient"),
    );
    vi.mocked(alertEmailDeliveryRepository.markFailed).mockResolvedValue(
      failedDelivery,
    );

    const result = await deliverBuySignalAlerts(
      {
        emailAlertsEnabled: true,
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      { alertEmailDeliveryRepository, emailDeliveryProvider },
    );

    expect(alertEmailDeliveryRepository.markFailed).toHaveBeenCalledWith({
      deliveryId: reservedDelivery.id,
      providerError: "SES rejected recipient",
    });
    expect(result).toEqual([
      { delivery: failedDelivery, signal, type: "failed" },
    ]);
  });

  it("does not send when a delivery record already exists for the signal and recipient", async () => {
    const alertEmailDeliveryRepository = createAlertEmailDeliveryRepository();
    const emailDeliveryProvider = createEmailDeliveryProvider();
    const signal = createSignal();
    vi.mocked(alertEmailDeliveryRepository.reserve).mockResolvedValue(null);

    const result = await deliverBuySignalAlerts(
      {
        emailAlertsEnabled: true,
        recipientEmail: "user@example.com",
        signals: [signal],
      },
      { alertEmailDeliveryRepository, emailDeliveryProvider },
    );

    expect(emailDeliveryProvider.sendBuySignalAlert).not.toHaveBeenCalled();
    expect(result).toEqual([{ signal, type: "duplicate" }]);
  });
});

function createAlertEmailDeliveryRepository(): AlertEmailDeliveryRepository {
  return {
    createSkipped: vi.fn(),
    markFailed: vi.fn(),
    markSent: vi.fn(),
    reserve: vi.fn(),
  };
}

function createEmailDeliveryProvider(): EmailDeliveryProvider {
  return {
    name: "ses",
    sendBuySignalAlert: vi.fn(),
  };
}

function createSignal(): Signal {
  return {
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    id: toSignalId("signal-1"),
    marketDate: "2026-01-02",
    profileId: toProfileId("profile-1"),
    reason: "EMA6_CROSSED_ABOVE_EMA42",
    signalType: "BUY",
    symbol: "PETR4",
  };
}

function createDelivery({
  providerError = null,
  providerMessageId = null,
  sentAt = null,
  signal,
  skippedReason = null,
  status = "PENDING",
}: {
  providerError?: string | null;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  signal: Signal;
  skippedReason?: AlertEmailDelivery["skippedReason"];
  status?: AlertEmailDelivery["status"];
}): AlertEmailDelivery {
  return {
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    id: toAlertEmailDeliveryId("delivery-1"),
    provider: status === "SKIPPED" ? null : "ses",
    providerError,
    providerMessageId,
    recipientEmail: "user@example.com",
    sentAt,
    signalId: signal.id,
    skippedReason,
    status,
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}
