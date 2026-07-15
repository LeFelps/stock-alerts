"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleHelp, Copy, LoaderCircle, RotateCcw } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
      <CenteredCell>
        <Badge
          variant={
            row.original.status === "FAILED" ? "destructive" : "secondary"
          }
        >
          {formatStatus(row.original)}
        </Badge>
      </CenteredCell>
    ),
    header: () => <CenteredHeader>Status</CenteredHeader>,
    id: "status",
  },
  {
    accessorFn: (jobRun) => formatDuration(jobRun.durationMs),
    cell: ({ getValue }) => <CenteredCell>{String(getValue())}</CenteredCell>,
    header: () => <CenteredHeader>Duração</CenteredHeader>,
    id: "duration",
  },
  {
    accessorFn: (jobRun) =>
      `${jobRun.summary.refreshedSymbols}/${jobRun.summary.uniqueSymbols}`,
    cell: ({ getValue }) => <CenteredCell>{String(getValue())}</CenteredCell>,
    header: () => <CenteredHeader>Ativos</CenteredHeader>,
    id: "symbols",
  },
  {
    accessorFn: (jobRun) => jobRun.summary.staleTargets,
    cell: ({ getValue }) => <CenteredCell>{String(getValue())}</CenteredCell>,
    header: () => <IgnoredHeader />,
    id: "staleTargets",
  },
  {
    accessorFn: (jobRun) => jobRun.summary.createdSignals,
    cell: ({ getValue }) => <CenteredCell>{String(getValue())}</CenteredCell>,
    header: () => <CenteredHeader>Sinais</CenteredHeader>,
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
      {error ? (
        <HoverCard openDelay={100}>
          <HoverCardTrigger asChild>
            <span
              aria-label="Ver erro completo"
              className="min-w-0 flex-1 cursor-help truncate text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              tabIndex={0}
            >
              {label}
            </span>
          </HoverCardTrigger>
          <HoverCardContent align="end" className="w-96 max-w-[90vw]">
            <p className="break-words text-sm whitespace-pre-wrap">{error}</p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {label}
        </span>
      )}
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

function CenteredCell({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center text-center">{children}</div>;
}

function CenteredHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-center">{children}</div>;
}

function IgnoredHeader() {
  return (
    <CenteredHeader>
      <span className="inline-flex items-center justify-center gap-1">
        Ignorados
        <HoverCard openDelay={100}>
          <HoverCardTrigger asChild>
            <button
              aria-label="O que significa Ignorados?"
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
            >
              <CircleHelp aria-hidden="true" className="size-3.5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="text-left text-sm font-normal whitespace-normal">
            Perfis e Ativos cujo pregão mais recente já havia sido processado.
            Nenhuma nova análise ou envio de email foi necessário.
          </HoverCardContent>
        </HoverCard>
      </span>
    </CenteredHeader>
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
