import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
} from "resend";

import type { EmailDeliveryProvider } from "../application/ports";
import {
  buildDigestHtmlBody,
  buildDigestSubject,
  buildDigestTextBody,
} from "../ui/buy-signal-digest-email";
import {
  DIGEST_ASSET_FALLBACK_ICON_CONTENT_ID,
  DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64,
  DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID,
  DIGEST_EXTERNAL_LINK_ICON_PNG_BASE64,
} from "../ui/email-assets";

type ResendEmailDeliveryProviderConfig = {
  apiKey: string;
  appBaseUrl: string;
  fromEmail: string;
};

export type ResendEmailClient = {
  send(email: CreateEmailOptions): Promise<CreateEmailResponse>;
};

export function createResendEmailDeliveryProvider(
  { apiKey, appBaseUrl, fromEmail }: ResendEmailDeliveryProviderConfig,
  client: ResendEmailClient = new Resend(apiKey).emails,
): EmailDeliveryProvider {
  return {
    name: "resend",
    async sendBuySignalDigest(email) {
      const { data, error } = await client.send({
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
        from: fromEmail,
        html: buildDigestHtmlBody(email, appBaseUrl, {
          assetFallbackIconSrc: `cid:${DIGEST_ASSET_FALLBACK_ICON_CONTENT_ID}`,
          externalLinkIconSrc: `cid:${DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID}`,
        }),
        subject: buildDigestSubject(email.marketDate),
        text: buildDigestTextBody(email, appBaseUrl),
        to: [email.recipientEmail],
      });

      if (error) {
        throw new Error(formatResendError(error));
      }

      return { providerMessageId: data.id };
    },
  };
}

function formatResendError(error: {
  message: string;
  name: string;
  statusCode: number | null;
}) {
  const status = error.statusCode ? `, HTTP ${error.statusCode}` : "";

  return `Resend email delivery failed (${error.name}${status}): ${error.message}`;
}
