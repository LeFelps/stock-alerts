import type { ProfileId } from "@/features/profiles/domain/profile";

import type { NewSignal } from "../domain/signal";
import type { SignalRepository } from "./ports";

type SignalDependencies = {
  signalRepository: SignalRepository;
};

export async function recordSignals(
  command: { signals: NewSignal[] },
  { signalRepository }: SignalDependencies,
) {
  return signalRepository.upsertMany(command.signals);
}

export async function listSignalsForProfile(
  command: { profileId: ProfileId },
  { signalRepository }: SignalDependencies,
) {
  return signalRepository.listForProfile(command.profileId);
}
