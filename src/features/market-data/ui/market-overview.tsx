"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChartNoAxesCombined } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import type { WatchlistItem } from "@/features/watchlist/domain/watchlist-item";
import { AssetLogo } from "@/features/watchlist/ui/asset-logo";
import { formatHumanDate } from "@/lib/format-date";

export type MarketOverviewItem = {
  latestIndicator: IndicatorSnapshot | null;
  watchlistItem: WatchlistItem;
};

export function MarketOverview({ items }: { items: MarketOverviewItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Adicione um Ativo na Lista de acompanhamento para ver dados de mercado."
        title="Nenhum Ativo em acompanhamento."
      />
    );
  }

  return (
    <DataTable
      columnLabels={marketColumnLabels}
      columns={marketColumns}
      data={items}
      getRowId={(item) => item.watchlistItem.id}
      searchPlaceholder="Buscar ativos…"
      showColumnPicker
    />
  );
}

const marketColumns: ColumnDef<MarketOverviewItem>[] = [
  {
    cell: ({ row }) => <AssetLogo item={row.original.watchlistItem} />,
    enableHiding: false,
    header: "Ícone",
    id: "icon",
  },
  {
    accessorFn: ({ watchlistItem }) =>
      `${watchlistItem.symbol} ${watchlistItem.longName ?? ""}`,
    cell: ({ row }) => (
      <div className="grid max-w-64 gap-0.5">
        <span className="font-medium">{row.original.watchlistItem.symbol}</span>
        <span
          className="truncate text-xs text-muted-foreground"
          title={
            row.original.watchlistItem.longName ??
            row.original.watchlistItem.symbol
          }
        >
          {row.original.watchlistItem.longName ??
            row.original.watchlistItem.symbol}
        </span>
      </div>
    ),
    header: "Ativo",
    id: "asset",
  },
  {
    accessorFn: ({ latestIndicator }) => formatCurrency(latestIndicator?.close),
    header: "Preço",
    id: "price",
  },
  {
    accessorFn: () => "Aguardando regra",
    cell: () => <Badge variant="secondary">Aguardando regra</Badge>,
    header: "Sinal",
    id: "signal",
  },
  {
    accessorFn: ({ latestIndicator }) =>
      formatMarketDate(latestIndicator?.marketDate ?? null),
    header: "Última atualização",
    id: "marketDate",
  },
  {
    accessorFn: ({ watchlistItem }) =>
      watchlistItem.enabled ? "Ativo" : "Pausado",
    cell: ({ row }) => (
      <Badge
        variant={row.original.watchlistItem.enabled ? "default" : "secondary"}
      >
        {row.original.watchlistItem.enabled ? "Ativo" : "Pausado"}
      </Badge>
    ),
    header: "Status",
    id: "status",
  },
  {
    cell: ({ row }) => (
      <div className="text-right">
        <Button asChild size="icon-sm" variant="outline">
          <Link
            aria-label={`Ver gráficos de ${row.original.watchlistItem.symbol}`}
            href={`/dashboard/tickers/${row.original.watchlistItem.symbol}`}
            title={`Ver gráficos de ${row.original.watchlistItem.symbol}`}
          >
            <ChartNoAxesCombined aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
    header: () => <span className="sr-only">Gráficos</span>,
    id: "actions",
  },
];

const marketColumnLabels = {
  asset: "Ativo",
  marketDate: "Última atualização",
  price: "Preço",
  signal: "Sinal",
  status: "Status",
};

function formatCurrency(value: number | null | undefined) {
  return value == null
    ? "Sem dados"
    : new Intl.NumberFormat("pt-BR", {
        currency: "BRL",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
      }).format(value);
}

function formatMarketDate(marketDate: string | null) {
  return marketDate ? formatHumanDate(marketDate) : "Sem dados";
}
