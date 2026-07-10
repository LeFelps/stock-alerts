import { Badge } from "@/components/ui/badge";

import type { JobRun } from "../domain/job-run";

export function JobRunsHistory({ jobRuns }: { jobRuns: JobRun[] }) {
  if (jobRuns.length === 0) {
    return (
      <div className="border-b py-10 text-center">
        <p className="font-medium">Nenhuma execução registrada.</p>
        <p className="pt-2 text-sm text-muted-foreground">
          As execuções aparecem aqui quando a rotina de verificação de alertas é
          acionada.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Início</th>
            <th className="border-b px-3 py-3 font-medium">Status</th>
            <th className="border-b px-3 py-3 font-medium">Duração</th>
            <th className="border-b px-3 py-3 font-medium">Ativos</th>
            <th className="border-b px-3 py-3 font-medium">Sinais</th>
            <th className="border-b px-3 py-3 font-medium">Emails</th>
            <th className="border-b px-3 py-3 font-medium">Erro</th>
          </tr>
        </thead>
        <tbody>
          {jobRuns.map((jobRun) => (
            <tr key={jobRun.id}>
              <td className="border-b px-3 py-3">
                {formatDateTime(jobRun.startedAt)}
              </td>
              <td className="border-b px-3 py-3">
                <Badge
                  variant={
                    jobRun.status === "FAILED" ? "destructive" : "secondary"
                  }
                >
                  {formatStatus(jobRun)}
                </Badge>
              </td>
              <td className="border-b px-3 py-3">
                {formatDuration(jobRun.durationMs)}
              </td>
              <td className="border-b px-3 py-3">
                {jobRun.summary.refreshedSymbols}/{jobRun.summary.uniqueSymbols}
              </td>
              <td className="border-b px-3 py-3">
                {jobRun.summary.createdSignals}
              </td>
              <td className="border-b px-3 py-3">{formatEmails(jobRun)}</td>
              <td className="max-w-xs truncate border-b px-3 py-3 text-muted-foreground">
                {jobRun.error ?? "Sem erro"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatStatus(jobRun: JobRun) {
  switch (jobRun.status) {
    case "FAILED":
      return "Falha";
    case "RUNNING":
      return "Em execução";
    case "SUCCESS":
      return "Sucesso";
  }
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) {
    return "Em andamento";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatEmails(jobRun: JobRun) {
  return [
    `${jobRun.summary.sentEmails} enviados`,
    `${jobRun.summary.skippedEmails} ignorados`,
    `${jobRun.summary.failedEmails} falharam`,
  ].join(" · ");
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
