import { describe, expect, it } from "vitest";

import { createConfiguredEmailDeliveryProvider } from "./email-delivery-provider-factory";

describe("email delivery provider factory", () => {
  it("creates the SES provider when email delivery config is present", () => {
    const provider = createConfiguredEmailDeliveryProvider({
      ALERT_EMAIL_FROM: "alerts@example.com",
      AWS_REGION: "us-east-1",
      EMAIL_PROVIDER: "ses",
    });

    expect(provider).toHaveProperty("name", "ses");
    expect(provider).toHaveProperty("sendBuySignalAlert");
  });

  it("defaults to SES but requires the sender address", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        AWS_REGION: "us-east-1",
      }),
    ).toThrow("ALERT_EMAIL_FROM is required for email delivery");
  });

  it("requires an AWS region for SES", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        ALERT_EMAIL_FROM: "alerts@example.com",
        EMAIL_PROVIDER: "ses",
      }),
    ).toThrow("AWS_REGION is required for email delivery");
  });

  it("rejects unsupported providers", () => {
    expect(() =>
      createConfiguredEmailDeliveryProvider({
        ALERT_EMAIL_FROM: "alerts@example.com",
        AWS_REGION: "us-east-1",
        EMAIL_PROVIDER: "unknown",
      }),
    ).toThrow();
  });
});
