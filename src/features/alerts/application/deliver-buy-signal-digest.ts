import type { Signal } from "@/features/signals/domain/signal";

import type {
  AlertEmailDelivery,
  BuySignalDigestAsset,
} from "../domain/email-delivery";
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
    assets: BuySignalDigestAsset[];
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

  const assetsBySymbol = new Map(
    command.assets.map((asset) => [asset.symbol, asset]),
  );
  const missingAsset = command.signals.find(
    (signal) => !assetsBySymbol.has(signal.symbol),
  );

  if (missingAsset) {
    throw new Error(
      `Buy signal digest is missing asset data for ${missingAsset.symbol}`,
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
  const reservedSymbols = new Set(
    reservedSignals.map((signal) => signal.symbol),
  );
  const deliveryIds = deliveries.map((delivery) => delivery.id);

  try {
    const sendResult = await emailDeliveryProvider.sendBuySignalDigest({
      assets: command.assets.filter((asset) =>
        reservedSymbols.has(asset.symbol),
      ),
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
