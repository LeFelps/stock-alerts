import { describe, expect, it, vi } from "vitest";

import { toProfileId } from "@/features/profiles/domain/profile";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import {
  createResendEmailDeliveryProvider,
  type ResendEmailClient,
} from "./resend-email-delivery-provider";
import {
  buildDigestHtmlBody,
  buildDigestSubject,
  buildDigestTextBody,
} from "../ui/buy-signal-digest-email";
import {
  DIGEST_ASSET_FALLBACK_ICON_CONTENT_ID,
  DIGEST_ASSET_FALLBACK_ICON_DATA_URI,
  DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64,
  DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID,
  DIGEST_EXTERNAL_LINK_ICON_PNG_BASE64,
} from "../ui/email-assets";

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
        appBaseUrl: "https://stock-alerts.example.com",
        fromEmail: "Stock Alerts <noreply.stock-alerts@fellcor.com>",
      },
      { send } as ResendEmailClient,
    );
    const email = {
      assets: [createAsset("PETR4", 32.57)],
      marketDate: "2026-07-13",
      recipientEmail: "user@example.com",
      signals: [createSignal("signal-1", "PETR4", "EMA6_CROSSED_ABOVE_EMA42")],
    };

    await expect(provider.sendBuySignalDigest(email)).resolves.toEqual({
      providerMessageId: "resend-message-1",
    });
    expect(send).toHaveBeenCalledWith({
      attachments: [
        {
          content: DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64,
          contentId: DIGEST_ASSET_FALLBACK_ICON_CONTENT_ID,
          contentType: "image/png",
          filename: "asset-fallback.png",
        },
        {
          content: DIGEST_EXTERNAL_LINK_ICON_PNG_BASE64,
          contentId: DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID,
          contentType: "image/png",
          filename: "external-link.png",
        },
      ],
      from: "Stock Alerts <noreply.stock-alerts@fellcor.com>",
      html: buildDigestHtmlBody(email, "https://stock-alerts.example.com", {
        assetFallbackIconSrc: `cid:${DIGEST_ASSET_FALLBACK_ICON_CONTENT_ID}`,
        externalLinkIconSrc: `cid:${DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID}`,
      }),
      subject: "[Stock Alerts] Sinais de compra — 13/07/2026",
      text: buildDigestTextBody(email, "https://stock-alerts.example.com"),
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
        appBaseUrl: "https://stock-alerts.example.com",
        fromEmail: "alerts@fellcor.com",
      },
      { send } as ResendEmailClient,
    );

    await expect(
      provider.sendBuySignalDigest({
        assets: [createAsset("PETR4", 32.57)],
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

  it("uses the app-equivalent asset fallback icon when no logo is available", () => {
    const asset = { ...createAsset("PETR4", 32.57), logoUrl: null };
    const html = buildDigestHtmlBody(
      {
        assets: [asset],
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [
          createSignal("signal-1", "PETR4", "EMA6_CROSSED_ABOVE_EMA42"),
        ],
      },
      "https://stock-alerts.example.com",
    );

    expect(html).toContain(`src="${DIGEST_ASSET_FALLBACK_ICON_DATA_URI}"`);
    expect(html).toContain('alt="Logo padrão de PETR4"');
    expect(html).not.toContain(">PET</div>");
  });

  it("keeps the date, price, signal, and details link in the text fallback", () => {
    const email = {
      assets: [createAsset("VALE3", 61.25), createAsset("PETR4", 32.57)],
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
    };
    const body = buildDigestTextBody(
      {
        ...email,
      },
      "https://stock-alerts.example.com",
    );

    expect(buildDigestSubject("2026-07-13")).toBe(
      "[Stock Alerts] Sinais de compra — 13/07/2026",
    );
    expect(body).toContain("Sinais de compra detectados em 13/07/2026");
    expect(body.indexOf("PETR4 — Petrobras")).toBeLessThan(
      body.indexOf("VALE3 — Vale"),
    );
    expect(body.match(/PETR4 — Petrobras/g)).toHaveLength(1);
    expect(body).toContain("Sinal: Compra técnica");
    expect(body).toContain("Preço: R$ 32,57");
    expect(body).toContain(
      "Ver detalhes: https://stock-alerts.example.com/dashboard/tickers/PETR4",
    );
    expect(body).toContain("Gatilho: MME6 > MME42");
    expect(body).toContain("Gatilho: MME6 > MME13 > MME42");
    expect(body).not.toContain("Fechamento");
    expect(body).toContain("não constitui recomendação de investimento");
  });

  it("renders an app-aligned HTML digest with highlighted date and asset rows", () => {
    const html = buildDigestHtmlBody(
      {
        assets: [createAsset("VALE3", 61.25), createAsset("PETR4", 32.57)],
        marketDate: "2026-07-13",
        recipientEmail: "user@example.com",
        signals: [
          createSignal("signal-1", "PETR4", "EMA6_CROSSED_ABOVE_EMA42"),
          createSignal(
            "signal-2",
            "VALE3",
            "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42",
          ),
        ],
      },
      "https://stock-alerts.example.com",
    );

    expect(html).toContain(
      "font-size:30px;font-weight:800;letter-spacing:-0.025em",
    );
    expect(html).toContain(">Stock Alerts</div>");
    expect(html).toContain("13 de julho de 2026");
    expect(html).toContain(
      "https://stock-alerts.example.com/api/alert-asset-logos/PETR4",
    );
    expect(html).not.toContain("https://icons.brapi.dev/icons/PETR4.svg");
    expect(html).toContain("Petrobras");
    expect(html).toContain("R$ 32,57");
    expect(html).toContain(">Compra técnica</span>");
    expect(html).toContain('style="color:#2563eb;">MME6</span>');
    expect(html).toContain('style="color:#c026d3;">MME13</span>');
    expect(html).toContain('style="color:#ea580c;">MME42</span>');
    expect(html).toContain(
      'href="https://stock-alerts.example.com/dashboard/tickers/PETR4"',
    );
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).not.toContain("<svg");
    expect(html).toContain("max-width:760px");
    expect(html).toContain("@media only screen and (max-width: 620px)");
    expect(html).toContain("@media (prefers-color-scheme: dark)");

    for (const color of [
      "#fafafa",
      "#18181b",
      "#ffffff",
      "#f4f4f5",
      "#52525b",
      "#e4e4e7",
      "#2563eb",
      "#0a0a0a",
      "#ededed",
      "#27272a",
      "#a1a1aa",
      "#3f3f46",
      "#60a5fa",
    ]) {
      expect(html).toContain(color);
    }

    expect(html.indexOf("PETR4")).toBeLessThan(html.indexOf("VALE3"));
    expect(html.indexOf("Petrobras")).toBeLessThan(html.indexOf("R$ 32,57"));
    expect(html.indexOf("R$ 32,57")).toBeLessThan(
      html.indexOf("Compra técnica"),
    );
    expect(html).not.toContain(">SA<");
    expect(html).not.toContain("Novo alerta");
    expect(html).not.toContain("Data do");
    expect(html.toLowerCase()).not.toContain(["pre", "gão"].join(""));
    expect(html).not.toContain("Fechamento");
  });
});

function createAsset(symbol: "PETR4" | "VALE3", currentPrice: number) {
  return {
    currency: "BRL",
    currentPrice,
    logoUrl: `https://icons.brapi.dev/icons/${symbol}.svg`,
    longName: symbol === "PETR4" ? "Petrobras" : "Vale",
    symbol,
  };
}

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
