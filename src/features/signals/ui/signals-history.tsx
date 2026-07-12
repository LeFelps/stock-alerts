"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EMA_COLORS } from "@/features/indicators/ui/ema-colors";
import { AssetLogo } from "@/features/watchlist/ui/asset-logo";
import { formatHumanDate, formatHumanDateTime } from "@/lib/format-date";

import type { Signal } from "../domain/signal";

export type SignalHistoryItem = {
  asset: { logoUrl: string | null; symbol: string };
  signal: Signal;
};

export function SignalsHistory({ items }: { items: SignalHistoryItem[] }) {
  if (items.length === 0) {
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
    accessorFn: ({ signal }) => formatSignalType(signal),
    cell: ({ row }) => (
      <Badge variant="secondary">{formatSignalType(row.original.signal)}</Badge>
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

function SignalReason({ signal }: { signal: Signal }) {
  return (
    <span className="font-medium">
      <span style={{ color: EMA_COLORS.ema6 }}>MME6</span>
      <span className="text-muted-foreground"> &gt; </span>
      {signal.reason === "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42" ? (
        <>
          <span style={{ color: EMA_COLORS.ema13 }}>MME13</span>
          <span className="text-muted-foreground"> &gt; </span>
        </>
      ) : null}
      <span style={{ color: EMA_COLORS.ema42 }}>MME42</span>
    </span>
  );
}
