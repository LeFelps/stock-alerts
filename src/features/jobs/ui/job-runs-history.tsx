"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatHumanDateTime } from "@/lib/format-date";

import type { JobRun } from "../domain/job-run";

export function JobRunsHistory({ jobRuns }: { jobRuns: JobRun[] }) {
  if (jobRuns.length === 0) {
    return (
      <EmptyState
        description="As execuções aparecem aqui quando a rotina de verificação de alertas é acionada."
        title="Nenhuma execução registrada."
      />
    );
  }

  return (
    <DataTable
      columnLabels={jobRunColumnLabels}
      columns={jobRunColumns}
      data={jobRuns}
      getRowId={(jobRun) => jobRun.id}
      searchPlaceholder="Buscar execuções…"
    />
  );
}

const jobRunColumns: ColumnDef<JobRun>[] = [
  {
    accessorFn: (jobRun) => formatHumanDateTime(jobRun.startedAt),
    header: "Início",
    id: "startedAt",
  },
  {
    accessorFn: formatStatus,
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "FAILED" ? "destructive" : "secondary"}
      >
        {formatStatus(row.original)}
      </Badge>
    ),
    header: "Status",
    id: "status",
  },
  {
    accessorFn: (jobRun) => formatDuration(jobRun.durationMs),
    header: "Duração",
    id: "duration",
  },
  {
    accessorFn: (jobRun) =>
      `${jobRun.summary.refreshedSymbols}/${jobRun.summary.uniqueSymbols}`,
    header: "Ativos",
    id: "symbols",
  },
  {
    accessorFn: (jobRun) => jobRun.summary.staleTargets,
    header: "Ignorados",
    id: "staleTargets",
  },
  {
    accessorFn: (jobRun) => jobRun.summary.createdSignals,
    header: "Sinais",
    id: "signals",
  },
  {
    accessorFn: formatEmails,
    header: "Emails",
    id: "emails",
  },
  {
    accessorFn: (jobRun) => jobRun.error ?? "Sem erro",
    cell: ({ row }) => (
      <span
        className="block max-w-xs truncate text-muted-foreground"
        title={row.original.error ?? "Sem erro"}
      >
        {row.original.error ?? "Sem erro"}
      </span>
    ),
    header: "Erro",
    id: "error",
  },
];

const jobRunColumnLabels = {
  duration: "Duração",
  emails: "Emails",
  error: "Erro",
  signals: "Sinais",
  staleTargets: "Ignorados",
  startedAt: "Início",
  status: "Status",
  symbols: "Ativos",
};

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
