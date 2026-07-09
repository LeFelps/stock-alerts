import type { ProfileId } from "@/features/profiles/domain/profile";

import type { NewSignal, Signal } from "../domain/signal";

export type SignalRepository = {
  listForProfile(profileId: ProfileId): Promise<Signal[]>;
  upsertMany(signals: NewSignal[]): Promise<Signal[]>;
};
