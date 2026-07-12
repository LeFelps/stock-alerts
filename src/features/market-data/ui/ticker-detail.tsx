"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";
import type { WatchlistItem } from "@/features/watchlist/domain/watchlist-item";
import { formatHumanDate } from "@/lib/format-date";

import { MarketDataRefreshButton } from "./market-data-refresh-button";

export function TickerDetail({
  indicatorSnapshots,
  priceSnapshots,
  watchlistItem,
}: {
  indicatorSnapshots: IndicatorSnapshot[];
  priceSnapshots: PriceSnapshot[];
  watchlistItem: WatchlistItem;
}) {
  const latestPrice = priceSnapshots.at(-1) ?? null;
  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <Button asChild className="w-fit" size="sm" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{watchlistItem.symbol}</h2>
            <p className="text-sm text-muted-foreground">
              {watchlistItem.longName ?? watchlistItem.symbol}
            </p>
          </div>
        </div>
        <MarketDataRefreshButton
          itemId={watchlistItem.id}
          revalidatePath={`/dashboard/tickers/${watchlistItem.symbol}`}
          symbol={watchlistItem.symbol}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Último preço"
          value={formatCurrency(latestPrice?.close)}
        />
        <Metric
          label="Última atualização"
          value={formatMarketDate(latestPrice?.marketDate ?? null)}
        />
        <Metric label="Abertura" value={formatCurrency(latestPrice?.open)} />
        <Metric label="Volume" value={formatInteger(latestPrice?.volume)} />
      </section>

      {priceSnapshots.length === 0 ? (
        <div className="border-b py-10 text-center">
          <p className="font-medium">Sem dados de mercado salvos.</p>
          <p className="pt-2 text-sm text-muted-foreground">
            Use Atualizar dados para buscar cotações diárias da brapi.dev.
          </p>
        </div>
      ) : (
        <div className="grid gap-8">
          <section className="grid gap-4">
            <h3 className="text-lg font-semibold">Preços de fechamento</h3>
            <CompactPriceTable snapshots={priceSnapshots.slice(-30)} />
          </section>

          <section className="grid gap-4">
            <h3 className="text-lg font-semibold">Dados do gráfico MME</h3>
            <IndicatorTable snapshots={indicatorSnapshots.slice(-60)} />
          </section>

          <section className="grid gap-4">
            <h3 className="text-lg font-semibold">Snapshots brutos</h3>
            <RawSnapshots snapshots={priceSnapshots.slice(-5)} />
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

function CompactPriceTable({ snapshots }: { snapshots: PriceSnapshot[] }) {
  return (
    <DataTable
      columnLabels={priceColumnLabels}
      columns={priceColumns}
      data={snapshots}
      getRowId={(snapshot) => `${snapshot.source}-${snapshot.marketDate}`}
      searchPlaceholder="Buscar preços…"
    />
  );
}

const priceColumns: ColumnDef<PriceSnapshot>[] = [
  {
    accessorFn: (snapshot) => formatMarketDate(snapshot.marketDate),
    header: "Pregão",
    id: "marketDate",
  },
  {
    accessorFn: (snapshot) => formatCurrency(snapshot.open),
    header: "Abertura",
    id: "open",
  },
  {
    accessorFn: (snapshot) => formatCurrency(snapshot.high),
    header: "Máxima",
    id: "high",
  },
  {
    accessorFn: (snapshot) => formatCurrency(snapshot.low),
    header: "Mínima",
    id: "low",
  },
  {
    accessorFn: (snapshot) => formatCurrency(snapshot.close),
    header: "Fechamento",
    id: "close",
  },
  {
    accessorFn: (snapshot) => formatInteger(snapshot.volume),
    header: "Volume",
    id: "volume",
  },
];

const priceColumnLabels = {
  close: "Fechamento",
  high: "Máxima",
  low: "Mínima",
  marketDate: "Pregão",
  open: "Abertura",
  volume: "Volume",
};

function IndicatorTable({ snapshots }: { snapshots: IndicatorSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <p className="border-b pb-4 text-sm text-muted-foreground">
        Sem indicadores calculados para este Ativo.
      </p>
    );
  }

  return (
    <DataTable
      columnLabels={indicatorColumnLabels}
      columns={indicatorColumns}
      data={snapshots}
      getRowId={(snapshot) => snapshot.marketDate}
      searchPlaceholder="Buscar indicadores…"
    />
  );
}

const indicatorColumns: ColumnDef<IndicatorSnapshot>[] = [
  {
    accessorFn: (snapshot) => formatMarketDate(snapshot.marketDate),
    header: "Pregão",
    id: "marketDate",
  },
  {
    accessorFn: (snapshot) => formatCurrency(snapshot.close),
    header: "Fechamento",
    id: "close",
  },
  {
    accessorFn: (snapshot) => formatNumber(snapshot.ema6),
    header: "MME6",
    id: "ema6",
  },
  {
    accessorFn: (snapshot) => formatNumber(snapshot.ema13),
    header: "MME13",
    id: "ema13",
  },
  {
    accessorFn: (snapshot) => formatNumber(snapshot.ema42),
    header: "MME42",
    id: "ema42",
  },
];

const indicatorColumnLabels = {
  close: "Fechamento",
  ema13: "MME13",
  ema42: "MME42",
  ema6: "MME6",
  marketDate: "Pregão",
};

function RawSnapshots({ snapshots }: { snapshots: PriceSnapshot[] }) {
  return (
    <div className="grid gap-3">
      {snapshots.map((snapshot) => (
        <details className="border-b pb-3" key={snapshot.marketDate}>
          <summary className="cursor-pointer text-sm font-medium">
            {formatMarketDate(snapshot.marketDate)}
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(snapshot.rawPayload, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

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

function formatNumber(value: number | null | undefined) {
  return value == null
    ? "Sem dados"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value);
}

function formatInteger(value: number | null | undefined) {
  return value == null
    ? "Sem dados"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
      }).format(value);
}

function formatMarketDate(marketDate: string | null) {
  return marketDate ? formatHumanDate(marketDate) : "Sem dados";
}
