import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import {
  buildDigestSubject,
  buildDigestTextBody,
  createResendEmailDeliveryProvider,
  type ResendEmailClient,
} from "./resend-email-delivery-provider";

describe("Resend buy signal digest delivery", () => {
  it("sends the existing digest content and returns the Resend message ID", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "resend-message-1" },
      error: null,
      headers: null,
    });
    const provider = createResendEmailDeliveryProvider(
      {
        apiKey: "re_project_key",
        fromEmail: "Stock Alerts <noreply.stock-alerts@fellcor.com>",
      },
      { send } as ResendEmailClient,
    );
    const email = {
      marketDate: "2026-07-13",
      recipientEmail: "user@example.com",
      signals: [createSignal("signal-1", "PETR4", "EMA6_CROSSED_ABOVE_EMA42")],
    };

    await expect(provider.sendBuySignalDigest(email)).resolves.toEqual({
      providerMessageId: "resend-message-1",
    });
    expect(send).toHaveBeenCalledWith({
      from: "Stock Alerts <noreply.stock-alerts@fellcor.com>",
      subject: "[ALERTA] Sugestões de compra — 13/07/2026",
      text: buildDigestTextBody(email),
      to: ["user@example.com"],
    });
  });

  it("throws a useful error when Resend rejects the request", async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Too many requests",
        name: "rate_limit_exceeded",
        statusCode: 429,
      },
      headers: null,
    });
    const provider = createResendEmailDeliveryProvider(
      {
        apiKey: "re_project_key",
        fromEmail: "alerts@fellcor.com",
      },
      { send } as ResendEmailClient,
    );

    await expect(
      provider.sendBuySignalDigest({
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [
          createSignal("signal-1", "PETR4", "EMA6_CROSSED_ABOVE_EMA42"),
        ],
      }),
    ).rejects.toThrow(
      "Resend email delivery failed (rate_limit_exceeded, HTTP 429): Too many requests",
    );
  });

  it("keeps the date and deterministically grouped body formatting", () => {
    const body = buildDigestTextBody({
      marketDate: "2026-07-13",
      recipientEmail: "user@example.com",
      signals: [
        createSignal("signal-1", "VALE3", "EMA6_CROSSED_ABOVE_EMA42"),
        createSignal("signal-2", "PETR4", "EMA6_CROSSED_ABOVE_EMA42"),
        createSignal(
          "signal-3",
          "PETR4",
          "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42",
        ),
      ],
    });

    expect(buildDigestSubject("2026-07-13")).toBe(
      "[ALERTA] Sugestões de compra — 13/07/2026",
    );
    expect(body).toContain("Sugestões de compra para 13/07/2026:");
    expect(body.indexOf("Ativo: PETR4")).toBeLessThan(
      body.indexOf("Ativo: VALE3"),
    );
    expect(body.match(/Ativo: PETR4/g)).toHaveLength(1);
    expect(body).toContain(
      "MME6 cruzou acima da MME13 enquanto estava acima da MME42.",
    );
    expect(body).toContain("não constitui recomendação de investimento");
  });
});

function createSignal(
  id: string,
  symbol: string,
  reason: Signal["reason"],
): Signal {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toSignalId(id),
    marketDate: "2026-07-13",
    profileId: toProfileId("profile-1"),
    reason,
    signalType: "BUY",
    symbol,
  };
}
