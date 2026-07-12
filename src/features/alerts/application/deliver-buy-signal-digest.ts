import type { Signal } from "@/features/signals/domain/signal";

import type { AlertEmailDelivery } from "../domain/email-delivery";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "./ports";

type DeliverBuySignalDigestDependencies = {
  alertEmailDeliveryRepository: AlertEmailDeliveryRepository;
  emailDeliveryProvider: EmailDeliveryProvider;
  now?: () => Date;
};

export type BuySignalDigestDeliveryOutcome =
  | { deliveries: AlertEmailDelivery[]; type: "sent" }
  | { deliveries: AlertEmailDelivery[]; type: "failed" }
  | { deliveries: AlertEmailDelivery[]; type: "skipped" }
  | { deliveries: []; type: "duplicate" };

export async function deliverBuySignalDigest(
  command: {
    emailAlertsEnabled: boolean;
    marketDate: string;
    recipientEmail: string;
    signals: Signal[];
  },
  {
    alertEmailDeliveryRepository,
    emailDeliveryProvider,
    now = () => new Date(),
  }: DeliverBuySignalDigestDependencies,
): Promise<BuySignalDigestDeliveryOutcome> {
  if (command.signals.length === 0) {
    return { deliveries: [], type: "duplicate" };
  }

  if (
    command.signals.some((signal) => signal.marketDate !== command.marketDate)
  ) {
    throw new Error(
      "Buy signal digest contains signals from another market date",
    );
  }

  const signalIds = command.signals.map((signal) => signal.id);

  if (!command.emailAlertsEnabled) {
    const deliveries = await alertEmailDeliveryRepository.createSkippedMany({
      recipientEmail: command.recipientEmail,
      signalIds,
      skippedReason: "EMAIL_ALERTS_DISABLED",
    });

    return deliveries.length > 0
      ? { deliveries, type: "skipped" }
      : { deliveries: [], type: "duplicate" };
  }

  const deliveries = await alertEmailDeliveryRepository.reserveMany({
    provider: emailDeliveryProvider.name,
    recipientEmail: command.recipientEmail,
    signalIds,
  });

  if (deliveries.length === 0) {
    return { deliveries: [], type: "duplicate" };
  }

  const reservedSignalIds = new Set(
    deliveries.map((delivery) => delivery.signalId),
  );
  const reservedSignals = command.signals.filter((signal) =>
    reservedSignalIds.has(signal.id),
  );
  const deliveryIds = deliveries.map((delivery) => delivery.id);

  try {
    const sendResult = await emailDeliveryProvider.sendBuySignalDigest({
      marketDate: command.marketDate,
      recipientEmail: command.recipientEmail,
      signals: reservedSignals,
    });
    const sentDeliveries = await alertEmailDeliveryRepository.markSentMany({
      deliveryIds,
      providerMessageId: sendResult.providerMessageId,
      sentAt: now(),
    });

    return { deliveries: sentDeliveries, type: "sent" };
  } catch (error) {
    const failedDeliveries = await alertEmailDeliveryRepository.markFailedMany({
      deliveryIds,
      providerError: formatProviderError(error),
    });

    return { deliveries: failedDeliveries, type: "failed" };
  }
}

function formatProviderError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  return String(error);
}
