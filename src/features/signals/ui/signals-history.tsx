"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatHumanDate, formatHumanDateTime } from "@/lib/format-date";

import type { Signal } from "../domain/signal";

export function SignalsHistory({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <div className="border-b py-10 text-center">
        <p className="font-medium">Nenhum Sinal registrado.</p>
        <p className="pt-2 text-sm text-muted-foreground">
          Sinais aparecem aqui quando as médias móveis salvas atendem às regras
          técnicas configuradas.
        </p>
      </div>
    );
  }

  return (
    <DataTable
      columnLabels={signalColumnLabels}
      columns={signalColumns}
      data={signals}
      getRowId={(signal) => signal.id}
      searchPlaceholder="Buscar sinais…"
    />
  );
}

const signalColumns: ColumnDef<Signal>[] = [
  {
    accessorKey: "symbol",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.symbol}</span>
    ),
    header: "Ativo",
  },
  {
    accessorFn: formatSignalType,
    cell: ({ row }) => (
      <Badge variant="secondary">{formatSignalType(row.original)}</Badge>
    ),
    header: "Tipo",
    id: "type",
  },
  {
    accessorFn: (signal) => formatHumanDate(signal.marketDate),
    header: "Pregão",
    id: "marketDate",
  },
  {
    accessorFn: formatSignalReason,
    header: "Motivo técnico",
    id: "reason",
  },
  {
    accessorFn: (signal) => formatHumanDateTime(signal.createdAt),
    header: "Registrado em",
    id: "createdAt",
  },
];

const signalColumnLabels = {
  createdAt: "Registrado em",
  marketDate: "Pregão",
  reason: "Motivo técnico",
  symbol: "Ativo",
  type: "Tipo",
};

function formatSignalType(signal: Signal) {
  return signal.signalType === "BUY" ? "Compra técnica" : signal.signalType;
}

function formatSignalReason(signal: Signal) {
  switch (signal.reason) {
    case "EMA6_CROSSED_ABOVE_EMA42":
      return "MME6 > MME42";
    case "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42":
      return "MME6 > MME13 > MME42";
  }
}
