import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
} from "resend";

import type { EmailDeliveryProvider } from "../application/ports";
import type { BuySignalDigestEmail } from "../domain/email-delivery";
import {
  buildDigestHtmlBody,
  buildDigestSubject,
  buildDigestTextBody,
} from "../ui/buy-signal-digest-email";
import {
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

export type RemoteImageFetcher = typeof fetch;

export function createResendEmailDeliveryProvider(
  { apiKey, appBaseUrl, fromEmail }: ResendEmailDeliveryProviderConfig,
  client: ResendEmailClient = new Resend(apiKey).emails,
  fetchRemoteImage: RemoteImageFetcher = fetch,
): EmailDeliveryProvider {
  return {
    name: "resend",
    async sendBuySignalDigest(email) {
      const renderableEmail = await replaceUnavailableLogos(
        email,
        fetchRemoteImage,
      );
      const { data, error } = await client.send({
        attachments: [
          {
            content: DIGEST_EXTERNAL_LINK_ICON_PNG_BASE64,
            contentId: DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID,
            contentType: "image/png",
            filename: "external-link.png",
          },
        ],
        from: fromEmail,
        html: buildDigestHtmlBody(renderableEmail, appBaseUrl, {
          externalLinkIconSrc: `cid:${DIGEST_EXTERNAL_LINK_ICON_CONTENT_ID}`,
        }),
        subject: buildDigestSubject(email.marketDate),
        text: buildDigestTextBody(renderableEmail, appBaseUrl),
        to: [email.recipientEmail],
      });

      if (error) {
        throw new Error(formatResendError(error));
      }

      return { providerMessageId: data.id };
    },
  };
}

async function replaceUnavailableLogos(
  email: BuySignalDigestEmail,
  fetchRemoteImage: RemoteImageFetcher,
): Promise<BuySignalDigestEmail> {
  const logoUrls = [
    ...new Set(
      email.assets.flatMap((asset) =>
        isSupportedLogoUrl(asset.logoUrl) ? [asset.logoUrl] : [],
      ),
    ),
  ];
  const availability = new Map(
    await Promise.all(
      logoUrls.map(
        async (logoUrl) =>
          [logoUrl, await isAvailableImage(logoUrl, fetchRemoteImage)] as const,
      ),
    ),
  );

  return {
    ...email,
    assets: email.assets.map((asset) => ({
      ...asset,
      logoUrl:
        asset.logoUrl && availability.get(asset.logoUrl) ? asset.logoUrl : null,
    })),
  };
}

async function isAvailableImage(
  url: string,
  fetchRemoteImage: RemoteImageFetcher,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);

  try {
    const response = await fetchRemoteImage(url, {
      headers: { Accept: "image/*" },
      redirect: "follow",
      signal: controller.signal,
    });
    const isImage = response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("image/");

    void response.body?.cancel().catch(() => undefined);

    return response.ok && isImage === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function isSupportedLogoUrl(value: string | null): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "icons.brapi.dev";
  } catch {
    return false;
  }
}

function formatResendError(error: {
  message: string;
  name: string;
  statusCode: number | null;
}) {
  const status = error.statusCode ? `, HTTP ${error.statusCode}` : "";

  return `Resend email delivery failed (${error.name}${status}): ${error.message}`;
}
