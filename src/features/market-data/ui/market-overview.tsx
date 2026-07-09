import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import type { WatchlistItem } from "@/features/watchlist/domain/watchlist-item";

export type MarketOverviewItem = {
  latestIndicator: IndicatorSnapshot | null;
  watchlistItem: WatchlistItem;
};

export function MarketOverview({ items }: { items: MarketOverviewItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-b py-10 text-center">
        <p className="font-medium">Nenhum Ativo em acompanhamento.</p>
        <p className="pt-2 text-sm text-muted-foreground">
          Adicione um Ativo na Lista de acompanhamento para ver dados de
          mercado.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[72rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Ativo</th>
            <th className="border-b px-3 py-3 font-medium">Preço</th>
            <th className="border-b px-3 py-3 font-medium">MME6</th>
            <th className="border-b px-3 py-3 font-medium">MME13</th>
            <th className="border-b px-3 py-3 font-medium">MME42</th>
            <th className="border-b px-3 py-3 font-medium">Sinal</th>
            <th className="border-b px-3 py-3 font-medium">Último pregão</th>
            <th className="border-b px-3 py-3 font-medium">Status</th>
            <th className="border-b px-3 py-3 text-right font-medium">
              Detalhes
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ latestIndicator, watchlistItem }) => (
            <tr key={watchlistItem.id}>
              <td className="border-b px-3 py-3 font-medium">
                {watchlistItem.symbol}
              </td>
              <td className="border-b px-3 py-3">
                {formatCurrency(latestIndicator?.close)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(latestIndicator?.ema6)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(latestIndicator?.ema13)}
              </td>
              <td className="border-b px-3 py-3">
                {formatNumber(latestIndicator?.ema42)}
              </td>
              <td className="border-b px-3 py-3">
                <Badge variant="secondary">Aguardando regra</Badge>
              </td>
              <td className="border-b px-3 py-3">
                {formatMarketDate(latestIndicator?.marketDate ?? null)}
              </td>
              <td className="border-b px-3 py-3">
                <Badge
                  variant={watchlistItem.enabled ? "default" : "secondary"}
                >
                  {watchlistItem.enabled ? "Ativo" : "Pausado"}
                </Badge>
              </td>
              <td className="border-b px-3 py-3 text-right">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/tickers/${watchlistItem.symbol}`}>
                    <ExternalLink aria-hidden="true" className="size-4" />
                    Abrir
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function formatMarketDate(marketDate: string | null) {
  if (!marketDate) {
    return "Sem dados";
  }

  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}
