import type { Signal, SignalId } from "@/features/signals/domain/signal";
import type { Brand } from "@/lib/brand";

export type AlertEmailDeliveryId = Brand<string, "AlertEmailDeliveryId">;
export type AlertEmailDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED";
export type EmailDeliveryProviderName = "resend";
export type RecordedEmailDeliveryProviderName =
  | EmailDeliveryProviderName
  | "ses";
export type AlertEmailSkippedReason = "EMAIL_ALERTS_DISABLED";

export type AlertEmailDelivery = {
  createdAt: Date;
  id: AlertEmailDeliveryId;
  provider: RecordedEmailDeliveryProviderName | null;
  providerError: string | null;
  providerMessageId: string | null;
  recipientEmail: string;
  sentAt: Date | null;
  signalId: SignalId;
  skippedReason: AlertEmailSkippedReason | null;
  status: AlertEmailDeliveryStatus;
  updatedAt: Date;
};

export type BuySignalDigestAsset = {
  currency: string;
  currentPrice: number;
  logoUrl: string | null;
  longName: string | null;
  symbol: string;
};

export type BuySignalDigestEmail = {
  assets: BuySignalDigestAsset[];
  marketDate: string;
  recipientEmail: string;
  signals: Signal[];
};

export function toAlertEmailDeliveryId(value: string): AlertEmailDeliveryId {
  return value as AlertEmailDeliveryId;
}
