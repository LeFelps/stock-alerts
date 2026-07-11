import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";
import { ProfileSettingsForm } from "@/features/profiles/ui/profile-settings-form";

export default async function PreferencesPage() {
  const currentProfile = await requireCurrentProfile();

  return (
    <DashboardShell
      activeSection="preferences"
      userEmail={currentProfile.email}
    >
      <section className="grid gap-6">
        <SectionHeader
          title="Preferências"
          description="Controle as preferências do seu Perfil e dos emails de alerta."
        />
        <ProfileSettingsForm
          email={currentProfile.email}
          profile={currentProfile.profile}
        />
      </section>
    </DashboardShell>
  );
}
