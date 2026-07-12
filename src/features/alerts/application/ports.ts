import type {
  AlertEmailDelivery,
  AlertEmailDeliveryId,
  AlertEmailSkippedReason,
  BuySignalDigestEmail,
  EmailDeliveryProviderName,
} from "../domain/email-delivery";
import type { SignalId } from "@/features/signals/domain/signal";

export type ReserveAlertEmailDeliveriesCommand = {
  provider: EmailDeliveryProviderName;
  recipientEmail: string;
  signalIds: SignalId[];
};

export type CreateSkippedAlertEmailDeliveriesCommand = {
  recipientEmail: string;
  signalIds: SignalId[];
  skippedReason: AlertEmailSkippedReason;
};

export type MarkAlertEmailDeliveriesSentCommand = {
  deliveryIds: AlertEmailDeliveryId[];
  providerMessageId?: string;
  sentAt: Date;
};

export type MarkAlertEmailDeliveriesFailedCommand = {
  deliveryIds: AlertEmailDeliveryId[];
  providerError: string;
};

export type AlertEmailDeliveryRepository = {
  createSkippedMany(
    command: CreateSkippedAlertEmailDeliveriesCommand,
  ): Promise<AlertEmailDelivery[]>;
  markFailedMany(
    command: MarkAlertEmailDeliveriesFailedCommand,
  ): Promise<AlertEmailDelivery[]>;
  markSentMany(
    command: MarkAlertEmailDeliveriesSentCommand,
  ): Promise<AlertEmailDelivery[]>;
  reserveMany(
    command: ReserveAlertEmailDeliveriesCommand,
  ): Promise<AlertEmailDelivery[]>;
};

export type EmailDeliveryProvider = {
  name: EmailDeliveryProviderName;
  sendBuySignalDigest(
    email: BuySignalDigestEmail,
  ): Promise<{ providerMessageId?: string }>;
};
