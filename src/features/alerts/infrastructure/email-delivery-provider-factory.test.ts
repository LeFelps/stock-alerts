import { describe, expect, it } from "vitest";

import { createConfiguredEmailDeliveryProvider } from "./email-delivery-provider-factory";

describe("email delivery provider factory", () => {
  it("creates the Resend provider from project-specific configuration", () => {
    const provider = createConfiguredEmailDeliveryProvider({
      ALERT_EMAIL_FROM: "Stock Alerts <noreply.stock-alerts@fellcor.com>",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_stock_alerts",
    });

    expect(provider).toHaveProperty("name", "resend");
    expect(provider).toHaveProperty("sendBuySignalDigest");
  });

  it("defaults to Resend", () => {
    const provider = createConfiguredEmailDeliveryProvider({
      ALERT_EMAIL_FROM: "alerts@fellcor.com",
      RESEND_API_KEY: "re_stock_alerts",
    });

    expect(provider.name).toBe("resend");
  });

  it("requires a Resend API key", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        ALERT_EMAIL_FROM: "alerts@fellcor.com",
      }),
    ).toThrow("RESEND_API_KEY is required for email delivery");
  });

  it("rejects a malformed Resend API key", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        ALERT_EMAIL_FROM: "alerts@fellcor.com",
        RESEND_API_KEY: "stock-alerts-key",
      }),
    ).toThrow("RESEND_API_KEY must be a Resend API key");
  });

  it("requires a valid sender address", () => {
    for (const fromEmail of [
      "not-an-email",
      "Stock Alerts <not-an-email>",
      "Stock Alerts <alerts@fellcor.com",
    ]) {
      expect(() =>
        createConfiguredEmailDeliveryProvider({
          ALERT_EMAIL_FROM: fromEmail,
          RESEND_API_KEY: "re_stock_alerts",
        }),
      ).toThrow("ALERT_EMAIL_FROM must be a valid email address");
    }
  });

  it("requires the sender address to use the exact fellcor.com domain", () => {
    for (const fromEmail of [
      "alerts@example.com",
      "Stock Alerts <alerts@mail.fellcor.com>",
    ]) {
      expect(() =>
        createConfiguredEmailDeliveryProvider({
          ALERT_EMAIL_FROM: fromEmail,
          RESEND_API_KEY: "re_stock_alerts",
        }),
      ).toThrow("ALERT_EMAIL_FROM must use the exact fellcor.com domain");
    }
  });

  it("rejects unsupported providers", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        ALERT_EMAIL_FROM: "alerts@fellcor.com",
        EMAIL_PROVIDER: "ses",
        RESEND_API_KEY: "re_stock_alerts",
      }),
    ).toThrow();
  });
});
