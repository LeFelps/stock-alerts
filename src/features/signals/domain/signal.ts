import type { ProfileId } from "@/features/profiles/domain/profile";
import type { Brand } from "@/lib/brand";

export type SignalId = Brand<string, "SignalId">;
export type SignalType = "BUY";
export type BuySignalReason =
  | "EMA6_CROSSED_ABOVE_EMA42"
  | "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42";

export type Signal = {
  createdAt: Date;
  id: SignalId;
  marketDate: string;
  profileId: ProfileId;
  reason: BuySignalReason;
  signalType: SignalType;
  symbol: string;
};

export type NewSignal = Omit<Signal, "createdAt" | "id">;

export function toSignalId(value: string): SignalId {
  return value as SignalId;
}
