import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import { refreshWatchlistItemMarketData } from "@/features/market-data/server/market-data.actions";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";
import type { WatchlistItem } from "@/features/watchlist/domain/watchlist-item";

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
  const refreshAction = refreshWatchlistItemMarketData.bind(
    null,
    watchlistItem.id,
  );

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
              {watchlistItem.displayName ?? "Ativo acompanhado"}
            </p>
          </div>
        </div>
        <form action={refreshAction}>
          <input
            name="revalidatePath"
            type="hidden"
            value={`/dashboard/tickers/${watchlistItem.symbol}`}
          />
          <Button type="submit" variant="outline">
            <RefreshCw aria-hidden="true" className="size-4" />
            Atualizar dados
          </Button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Último preço"
          value={formatCurrency(latestPrice?.close)}
        />
        <Metric
          label="Último pregão"
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Pregão</th>
            <th className="border-b px-3 py-3 font-medium">Abertura</th>
            <th className="border-b px-3 py-3 font-medium">Máxima</th>
            <th className="border-b px-3 py-3 font-medium">Mínima</th>
            <th className="border-b px-3 py-3 font-medium">Fechamento</th>
            <th className="border-b px-3 py-3 font-medium">Volume</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={`${snapshot.source}-${snapshot.marketDate}`}>
              <td className="border-b px-3 py-3">
                {formatMarketDate(snapshot.marketDate)}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(snapshot.open)}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(snapshot.high)}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(snapshot.low)}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(snapshot.close)}
              </td>
              <td className="border-b px-3 py-3">
                {formatInteger(snapshot.volume)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndicatorTable({ snapshots }: { snapshots: IndicatorSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <p className="border-b pb-4 text-sm text-muted-foreground">
        Sem indicadores calculados para este Ativo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Pregão</th>
            <th className="border-b px-3 py-3 font-medium">Fechamento</th>
            <th className="border-b px-3 py-3 font-medium">MME6</th>
            <th className="border-b px-3 py-3 font-medium">MME13</th>
            <th className="border-b px-3 py-3 font-medium">MME42</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.marketDate}>
              <td className="border-b px-3 py-3">
                {formatMarketDate(snapshot.marketDate)}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(snapshot.close)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(snapshot.ema6)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(snapshot.ema13)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(snapshot.ema42)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  if (!marketDate) {
    return "Sem dados";
  }

  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}
