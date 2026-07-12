"use client";

import { RefreshCw } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { WatchlistItemId } from "@/features/watchlist/domain/watchlist-item";

import { refreshWatchlistItemMarketData } from "../server/market-data.actions";

export function MarketDataRefreshButton({
  itemId,
  revalidatePath,
  symbol,
}: {
  itemId: WatchlistItemId;
  revalidatePath?: string;
  symbol: string;
}) {
  const [pending, setPending] = useState(false);

  function refresh() {
    if (pending) return;
    const formData = new FormData();
    if (revalidatePath) formData.set("revalidatePath", revalidatePath);
    setPending(true);

    startTransition(async () => {
      try {
        const result = await refreshWatchlistItemMarketData(itemId, formData);
        if (result.status === "error") {
          toast.error(
            `Não foi possível atualizar os dados de ${symbol}. Tente novamente.`,
          );
          return;
        }
        toast.success(`Dados de ${symbol} foram atualizados.`);
      } catch {
        toast.error(
          `Não foi possível atualizar os dados de ${symbol}. Tente novamente.`,
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Button
      aria-busy={pending}
      disabled={pending}
      onClick={refresh}
      type="button"
      variant="outline"
    >
      <RefreshCw
        aria-hidden="true"
        className={pending ? "size-4 animate-spin" : "size-4"}
      />
      {pending ? "Atualizando…" : "Atualizar dados"}
    </Button>
  );
}
