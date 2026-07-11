import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
import { listRecentJobRuns } from "@/features/jobs/application/manage-job-runs";
import { createDrizzleJobRunRepository } from "@/features/jobs/infrastructure/drizzle-job-run-repository";
import { JobRunsHistory } from "@/features/jobs/ui/job-runs-history";
import { JobRunsSummary } from "@/features/jobs/ui/job-runs-summary";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";

export default async function JobsPage() {
  const currentProfile = await requireCurrentProfile();
  const jobRuns = await listRecentJobRuns(
    { limit: 20 },
    { jobRunRepository: createDrizzleJobRunRepository() },
  );

  return (
    <DashboardShell activeSection="jobs" userEmail={currentProfile.email}>
      <section className="grid gap-6">
        <SectionHeader
          title="Execuções"
          description="Histórico da rotina agendada que atualiza dados de mercado, gera sinais técnicos e processa emails de alerta."
        />
        <JobRunsSummary jobRuns={jobRuns} />
        <JobRunsHistory jobRuns={jobRuns} />
      </section>
    </DashboardShell>
  );
}
