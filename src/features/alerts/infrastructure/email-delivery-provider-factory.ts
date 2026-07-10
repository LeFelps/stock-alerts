import { z } from "zod";

import type { EmailDeliveryProvider } from "../application/ports";
import { createSesEmailDeliveryProvider } from "./ses-email-delivery-provider";

type ProviderEnv = Partial<Record<string, string | undefined>>;

const emailProviderSchema = z.enum(["ses"]).default("ses");

export function createConfiguredEmailDeliveryProvider(
  env: ProviderEnv = process.env,
): EmailDeliveryProvider {
  const providerName = emailProviderSchema.parse(env.EMAIL_PROVIDER);

  switch (providerName) {
    case "ses":
      return createSesEmailDeliveryProvider({
        fromEmail: requiredEnv(env.ALERT_EMAIL_FROM, "ALERT_EMAIL_FROM"),
        region: requiredEnv(env.AWS_REGION, "AWS_REGION"),
      });
  }
}

function requiredEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is required for email delivery`);
  }

  return value;
}
