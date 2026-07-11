import type { JobRun } from "../domain/job-run";

export function JobRunsSummary({ jobRuns }: { jobRuns: JobRun[] }) {
  const failedJobs = jobRuns.filter((jobRun) => jobRun.status === "FAILED");
  const failedDeliveries = jobRuns.reduce(
    (total, jobRun) => total + jobRun.summary.failedEmails,
    0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryItem label="Execuções recentes" value={jobRuns.length} />
      <SummaryItem
        label="Execuções com falha"
        value={failedJobs.length}
        failed={failedJobs.length > 0}
      />
      <SummaryItem
        label="Emails com falha"
        value={failedDeliveries}
        failed={failedDeliveries > 0}
      />
    </div>
  );
}

function SummaryItem({
  failed = false,
  label,
  value,
}: {
  failed?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/55 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={
          failed
            ? "pt-1 text-2xl font-semibold text-destructive"
            : "pt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
