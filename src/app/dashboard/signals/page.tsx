import { SectionHeader } from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { listSignalsForProfile } from "@/features/signals/application/manage-signals";
import { createDrizzleSignalRepository } from "@/features/signals/infrastructure/drizzle-signal-repository";
import { SignalsHistory } from "@/features/signals/ui/signals-history";

export default async function SignalsPage() {
  const currentProfile = await requireCurrentProfile();
  const signals = await listSignalsForProfile(
    { profileId: currentProfile.profile.id },
    { signalRepository: createDrizzleSignalRepository() },
  );

  return (
    <section className="grid gap-6">
      <SectionHeader
        title="Sinais"
        description="Histórico de sinais técnicos gerados a partir das médias móveis salvas para o Perfil."
      />
      <SignalsHistory signals={signals} />
    </section>
  );
}
