"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy, LoaderCircle, RotateCcw } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatHumanDateTime } from "@/lib/format-date";

import type { JobRun } from "../domain/job-run";
import {
  retryCheckAlertsJob,
  type RetryCheckAlertsJobResult,
} from "../server/retry-check-alerts-job.action";

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
      toolbarAction={
        <RetryCheckAlertsButton disabled={jobRuns.at(0)?.status !== "FAILED"} />
      }
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
    cell: ({ row }) => <JobRunError error={row.original.error} />,
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

function RetryCheckAlertsButton({ disabled }: { disabled: boolean }) {
  const [pending, setPending] = useState(false);

  function retry() {
    if (disabled || pending) return;
    setPending(true);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("intent", "retry");
        const result = await retryCheckAlertsJob(formData);

        if (result.status === "success") {
          toast.success("Execução concluída com sucesso.");
          return;
        }

        toast.error(retryErrorMessage(result.error));
      } catch {
        toast.error("Não foi possível repetir a execução. Tente novamente.");
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Button
      aria-busy={pending}
      className="w-full sm:ml-auto sm:w-auto"
      disabled={disabled || pending}
      onClick={retry}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <RotateCcw aria-hidden="true" className="size-4" />
      )}
      {pending ? "Repetindo…" : "Tentar novamente"}
    </Button>
  );
}

function JobRunError({ error }: { error: string | null }) {
  const label = error ?? "Sem erro";

  async function copyError() {
    if (!error) return;

    try {
      await navigator.clipboard.writeText(error);
      toast.success("Erro copiado.");
    } catch {
      toast.error("Não foi possível copiar o erro.");
    }
  }

  return (
    <div className="flex max-w-xs items-center gap-1">
      <span
        className="min-w-0 flex-1 truncate text-muted-foreground"
        title={label}
      >
        {label}
      </span>
      {error ? (
        <Button
          aria-label="Copiar erro da execução"
          className="shrink-0"
          onClick={copyError}
          size="icon-sm"
          title="Copiar erro"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function retryErrorMessage(
  error: Extract<RetryCheckAlertsJobResult, { status: "error" }>["error"],
) {
  if (error === "not_retryable") {
    return "A execução mais recente não pode mais ser repetida.";
  }

  return "A nova execução também falhou. Consulte o erro mais recente.";
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
