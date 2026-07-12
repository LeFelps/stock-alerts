import type { ProfileId } from "@/features/profiles/domain/profile";

import type { NewSignal, Signal } from "../domain/signal";

export type SignalRepository = {
  findMatching(signals: NewSignal[]): Promise<Signal[]>;
  listForProfile(profileId: ProfileId): Promise<Signal[]>;
  upsertMany(signals: NewSignal[]): Promise<Signal[]>;
};
