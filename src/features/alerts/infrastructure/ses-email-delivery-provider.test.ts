import { describe, expect, it } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import {
  buildDigestSubject,
  buildDigestTextBody,
} from "./ses-email-delivery-provider";

describe("SES buy signal digest formatting", () => {
  it("includes the date and groups deterministically sorted reasons by symbol", () => {
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
