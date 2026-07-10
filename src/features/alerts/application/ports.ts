import type {
  AlertEmailDelivery,
  AlertEmailDeliveryId,
  AlertEmailSkippedReason,
  BuySignalAlertEmail,
  EmailDeliveryProviderName,
} from "../domain/email-delivery";
import type { SignalId } from "@/features/signals/domain/signal";

export type ReserveAlertEmailDeliveryCommand = {
  provider: EmailDeliveryProviderName;
  recipientEmail: string;
  signalId: SignalId;
};

export type CreateSkippedAlertEmailDeliveryCommand = {
  recipientEmail: string;
  signalId: SignalId;
  skippedReason: AlertEmailSkippedReason;
};

export type MarkAlertEmailDeliverySentCommand = {
  deliveryId: AlertEmailDeliveryId;
  providerMessageId?: string;
  sentAt: Date;
};

export type MarkAlertEmailDeliveryFailedCommand = {
  deliveryId: AlertEmailDeliveryId;
  providerError: string;
};

export type AlertEmailDeliveryRepository = {
  createSkipped(
    command: CreateSkippedAlertEmailDeliveryCommand,
  ): Promise<AlertEmailDelivery | null>;
  markFailed(
    command: MarkAlertEmailDeliveryFailedCommand,
  ): Promise<AlertEmailDelivery>;
  markSent(
    command: MarkAlertEmailDeliverySentCommand,
  ): Promise<AlertEmailDelivery>;
  reserve(
    command: ReserveAlertEmailDeliveryCommand,
  ): Promise<AlertEmailDelivery | null>;
};

export type EmailDeliveryProvider = {
  name: EmailDeliveryProviderName;
  sendBuySignalAlert(
    email: BuySignalAlertEmail,
  ): Promise<{ providerMessageId?: string }>;
};
