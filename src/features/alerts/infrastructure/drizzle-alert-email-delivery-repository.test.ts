import { describe, expect, it, vi } from "vitest";

import { toSignalId } from "@/features/signals/domain/signal";

import { createDrizzleAlertEmailDeliveryRepository } from "./drizzle-alert-email-delivery-repository";

vi.mock("@/db", () => ({ db: {} }));

describe("createDrizzleAlertEmailDeliveryRepository", () => {
  it("atomically reclaims a failed delivery when reserving it for retry", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        createdAt: new Date("2026-07-14T11:00:00.000Z"),
        id: "delivery-1",
        provider: "ses",
        providerError: null,
        providerMessageId: null,
        recipientEmail: "user@example.com",
        sentAt: null,
        signalId: "signal-1",
        skippedReason: null,
        status: "PENDING",
        updatedAt: new Date("2026-07-14T11:01:00.000Z"),
      },
    ]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values });
    const repository = createDrizzleAlertEmailDeliveryRepository({
      insert,
    } as never);

    await repository.reserveMany({
      provider: "ses",
      recipientEmail: "user@example.com",
      signalIds: [toSignalId("signal-1")],
    });

    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          provider: "ses",
          providerError: null,
          providerMessageId: null,
          sentAt: null,
          skippedReason: null,
          status: "PENDING",
        }),
        setWhere: expect.anything(),
      }),
    );
    expect(returning).toHaveBeenCalledOnce();
  });
});
