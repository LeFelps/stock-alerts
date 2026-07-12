import type { Signal, SignalId } from "@/features/signals/domain/signal";
import type { Brand } from "@/lib/brand";

export type AlertEmailDeliveryId = Brand<string, "AlertEmailDeliveryId">;
export type AlertEmailDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED";
export type EmailDeliveryProviderName = "ses";
export type AlertEmailSkippedReason = "EMAIL_ALERTS_DISABLED";

export type AlertEmailDelivery = {
  createdAt: Date;
  id: AlertEmailDeliveryId;
  provider: EmailDeliveryProviderName | null;
  providerError: string | null;
  providerMessageId: string | null;
  recipientEmail: string;
  sentAt: Date | null;
  signalId: SignalId;
  skippedReason: AlertEmailSkippedReason | null;
  status: AlertEmailDeliveryStatus;
  updatedAt: Date;
};

export type BuySignalDigestEmail = {
  marketDate: string;
  recipientEmail: string;
  signals: Signal[];
};

export function toAlertEmailDeliveryId(value: string): AlertEmailDeliveryId {
  return value as AlertEmailDeliveryId;
}
