"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetLogo } from "@/features/watchlist/ui/asset-logo";
import { formatHumanDate, formatHumanDateTime } from "@/lib/format-date";

import type { Signal } from "../domain/signal";
import {
  formatSignalTrigger,
  formatSignalType,
  getSignalTriggerSegments,
} from "./signal-presentation";

export type SignalHistoryItem = {
  asset: { logoUrl: string | null; symbol: string };
  signal: Signal;
};

export function SignalsHistory({ items }: { items: SignalHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Sinais aparecem aqui quando as médias móveis salvas atendem às regras técnicas configuradas."
        title="Nenhum Sinal registrado."
      />
    );
  }

  return (
    <DataTable
      columnLabels={signalColumnLabels}
      columns={signalColumns}
      data={items}
      getRowId={(item) => item.signal.id}
      searchPlaceholder="Buscar sinais…"
    />
  );
}

const signalColumns: ColumnDef<SignalHistoryItem>[] = [
  {
    cell: ({ row }) => <AssetLogo item={row.original.asset} />,
    enableHiding: false,
    header: "Ícone",
    id: "icon",
  },
  {
    accessorFn: ({ signal }) => signal.symbol,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.signal.symbol}</span>
    ),
    header: "Ativo",
    id: "symbol",
  },
  {
    accessorFn: ({ signal }) => formatSignalType(signal.signalType),
    cell: ({ row }) => (
      <Badge
        variant={row.original.signal.signalType === "BUY" ? "buy" : "secondary"}
      >
        {formatSignalType(row.original.signal.signalType)}
      </Badge>
    ),
    header: "Tipo",
    id: "type",
  },
  {
    accessorFn: ({ signal }) => formatHumanDate(signal.marketDate),
    header: "Data",
    id: "marketDate",
  },
  {
    accessorFn: ({ signal }) => formatSignalReason(signal),
    cell: ({ row }) => <SignalReason signal={row.original.signal} />,
    header: "Motivo técnico",
    id: "reason",
  },
  {
    accessorFn: ({ signal }) => formatHumanDateTime(signal.createdAt),
    header: "Registrado em",
    id: "createdAt",
  },
];

const signalColumnLabels = {
  createdAt: "Registrado em",
  marketDate: "Data",
  reason: "Motivo técnico",
  symbol: "Ativo",
  type: "Tipo",
};

function formatSignalReason(signal: Signal) {
  return formatSignalTrigger(signal.reason);
}

function SignalReason({ signal }: { signal: Signal }) {
  const segments = getSignalTriggerSegments(signal.reason);

  return (
    <span className="font-medium">
      {segments.map((segment, index) => (
        <span key={segment.label}>
          {index > 0 ? (
            <span className="text-muted-foreground"> &gt; </span>
          ) : null}
          <span style={{ color: segment.color }}>{segment.label}</span>
        </span>
      ))}
    </span>
  );
}
