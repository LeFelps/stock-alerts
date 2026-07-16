import { z } from "zod";

import type { EmailDeliveryProvider } from "../application/ports";
import { createResendEmailDeliveryProvider } from "./resend-email-delivery-provider";

type ProviderEnv = Partial<Record<string, string | undefined>>;

const senderEmailAddressSchema = z.string().email();

const emailDeliveryConfigSchema = z.object({
  ALERT_EMAIL_FROM: z
    .string({ error: "ALERT_EMAIL_FROM is required for email delivery" })
    .trim()
    .superRefine((sender, context) => {
      const emailAddress = extractSenderEmailAddress(sender);

      if (
        !emailAddress ||
        !senderEmailAddressSchema.safeParse(emailAddress).success
      ) {
        context.addIssue({
          code: "custom",
          message: "ALERT_EMAIL_FROM must be a valid email address",
        });
        return;
      }

      if (emailAddress.split("@").at(-1)?.toLowerCase() !== "fellcor.com") {
        context.addIssue({
          code: "custom",
          message: "ALERT_EMAIL_FROM must use the exact fellcor.com domain",
        });
      }
    }),
  APP_BASE_URL: z
    .url("APP_BASE_URL must be an absolute URL")
    .refine((value) => {
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return true;
      }
    }, "APP_BASE_URL must use HTTP or HTTPS")
    .optional(),
  EMAIL_PROVIDER: z.enum(["resend"]).default("resend"),
  RESEND_API_KEY: z
    .string({ error: "RESEND_API_KEY is required for email delivery" })
    .trim()
    .min(1, "RESEND_API_KEY is required for email delivery")
    .startsWith("re_", "RESEND_API_KEY must be a Resend API key"),
});

export function createConfiguredEmailDeliveryProvider(
  env: ProviderEnv = process.env,
): EmailDeliveryProvider {
  const config = emailDeliveryConfigSchema.parse(env);

  return createResendEmailDeliveryProvider({
    apiKey: config.RESEND_API_KEY,
    appBaseUrl: resolveAppBaseUrl(config.APP_BASE_URL, env),
    fromEmail: config.ALERT_EMAIL_FROM,
  });
}

function resolveAppBaseUrl(
  configuredUrl: string | undefined,
  env: ProviderEnv,
) {
  if (configuredUrl) return configuredUrl;

  const vercelHost =
    env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();

  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

function extractSenderEmailAddress(sender: string) {
  if (!sender.includes("<") && !sender.includes(">")) return sender;

  return sender.match(/^[^<>]+\s+<([^<>]+)>$/)?.[1]?.trim() ?? null;
}
