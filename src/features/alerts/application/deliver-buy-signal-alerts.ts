import type { Signal } from "@/features/signals/domain/signal";

import type { AlertEmailDelivery } from "../domain/email-delivery";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "./ports";

type DeliverBuySignalAlertsDependencies = {
  alertEmailDeliveryRepository: AlertEmailDeliveryRepository;
  emailDeliveryProvider: EmailDeliveryProvider;
  now?: () => Date;
};

export type BuySignalAlertDeliveryOutcome =
  | {
      delivery: AlertEmailDelivery;
      signal: Signal;
      type: "sent";
    }
  | {
      delivery: AlertEmailDelivery;
      signal: Signal;
      type: "failed";
    }
  | {
      delivery: AlertEmailDelivery;
      signal: Signal;
      type: "skipped";
    }
  | {
      signal: Signal;
      type: "duplicate";
    };

export async function deliverBuySignalAlerts(
  command: {
    emailAlertsEnabled: boolean;
    recipientEmail: string;
    signals: Signal[];
  },
  {
    alertEmailDeliveryRepository,
    emailDeliveryProvider,
    now = () => new Date(),
  }: DeliverBuySignalAlertsDependencies,
): Promise<BuySignalAlertDeliveryOutcome[]> {
  const outcomes: BuySignalAlertDeliveryOutcome[] = [];

  for (const signal of command.signals) {
    if (signal.signalType !== "BUY") {
      continue;
    }

    if (!command.emailAlertsEnabled) {
      const delivery = await alertEmailDeliveryRepository.createSkipped({
        recipientEmail: command.recipientEmail,
        signalId: signal.id,
        skippedReason: "EMAIL_ALERTS_DISABLED",
      });

      outcomes.push(
        delivery
          ? { delivery, signal, type: "skipped" }
          : { signal, type: "duplicate" },
      );
      continue;
    }

    const delivery = await alertEmailDeliveryRepository.reserve({
      provider: emailDeliveryProvider.name,
      recipientEmail: command.recipientEmail,
      signalId: signal.id,
    });

    if (!delivery) {
      outcomes.push({ signal, type: "duplicate" });
      continue;
    }

    try {
      const sendResult = await emailDeliveryProvider.sendBuySignalAlert({
        recipientEmail: command.recipientEmail,
        signal,
      });
      const sentDelivery = await alertEmailDeliveryRepository.markSent({
        deliveryId: delivery.id,
        providerMessageId: sendResult.providerMessageId,
        sentAt: now(),
      });

      outcomes.push({ delivery: sentDelivery, signal, type: "sent" });
    } catch (error) {
      const failedDelivery = await alertEmailDeliveryRepository.markFailed({
        deliveryId: delivery.id,
        providerError: formatProviderError(error),
      });

      outcomes.push({ delivery: failedDelivery, signal, type: "failed" });
    }
  }

  return outcomes;
}

function formatProviderError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}
