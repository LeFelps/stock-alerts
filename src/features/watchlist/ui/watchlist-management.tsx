import { Pause, Play, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { refreshWatchlistItemMarketData } from "@/features/market-data/server/market-data.actions";

import type { WatchlistItem } from "../domain/watchlist-item";
import {
  createWatchlistItem,
  deleteWatchlistItem,
  setWatchlistItemEnabled,
  updateWatchlistItem,
} from "../server/watchlist.actions";

const fieldClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
const textareaClassName =
  "min-h-10 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

export type WatchlistManagementItem = WatchlistItem & {
  latestMarketDate: string | null;
};

export function WatchlistManagement({
  items,
}: {
  items: WatchlistManagementItem[];
}) {
  return (
    <div className="grid gap-8">
      <form
        action={createWatchlistItem}
        className="grid items-end gap-4 border-b pb-8 md:grid-cols-[minmax(8rem,0.7fr)_minmax(12rem,1fr)_minmax(16rem,1.5fr)_auto]"
      >
        <label className="grid gap-2 text-sm font-medium">
          Código
          <input
            className={fieldClassName}
            maxLength={12}
            name="symbol"
            placeholder="PETR4"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Nome opcional
          <input
            className={fieldClassName}
            maxLength={120}
            name="displayName"
            placeholder="Petrobras"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Observações
          <input
            className={fieldClassName}
            maxLength={1000}
            name="notes"
            placeholder="Contexto para acompanhar este ativo"
          />
        </label>
        <Button type="submit">
          <Plus aria-hidden="true" className="size-4" />
          Adicionar ativo
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="border-b py-10 text-center">
          <p className="font-medium">A Lista de acompanhamento está vazia.</p>
          <p className="pt-2 text-sm text-muted-foreground">
            Adicione um Ativo para começar a monitorá-lo.
          </p>
        </div>
      ) : (
        <Table>
          <thead className="text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-3 font-medium">Código</th>
              <th className="border-b px-3 py-3 font-medium">Nome</th>
              <th className="border-b px-3 py-3 font-medium">Observações</th>
              <th className="border-b px-3 py-3 font-medium">
                Dados de mercado
              </th>
              <th className="border-b px-3 py-3 font-medium">Status</th>
              <th className="border-b px-3 py-3 text-right font-medium">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <WatchlistRow item={item} key={item.id} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function WatchlistRow({ item }: { item: WatchlistManagementItem }) {
  const formId = `watchlist-item-${item.id}`;
  const updateAction = updateWatchlistItem.bind(null, item.id);
  const refreshAction = refreshWatchlistItemMarketData.bind(null, item.id);
  const toggleAction = setWatchlistItemEnabled.bind(
    null,
    item.id,
    !item.enabled,
  );
  const deleteAction = deleteWatchlistItem.bind(null, item.id);

  return (
    <tr>
      <td className="border-b px-3 py-3 align-top">
        <form action={updateAction} id={formId}>
          <label className="sr-only" htmlFor={`${formId}-symbol`}>
            Código
          </label>
          <input
            className={fieldClassName}
            defaultValue={item.symbol}
            id={`${formId}-symbol`}
            maxLength={12}
            name="symbol"
            required
          />
        </form>
      </td>
      <td className="border-b px-3 py-3 align-top">
        <label className="sr-only" htmlFor={`${formId}-display-name`}>
          Nome opcional
        </label>
        <input
          className={fieldClassName}
          defaultValue={item.displayName ?? ""}
          form={formId}
          id={`${formId}-display-name`}
          maxLength={120}
          name="displayName"
        />
      </td>
      <td className="border-b px-3 py-3 align-top">
        <label className="sr-only" htmlFor={`${formId}-notes`}>
          Observações
        </label>
        <textarea
          className={textareaClassName}
          defaultValue={item.notes ?? ""}
          form={formId}
          id={`${formId}-notes`}
          maxLength={1000}
          name="notes"
          rows={1}
        />
      </td>
      <td className="border-b px-3 py-3 align-top">
        <div className="grid gap-1">
          <span className="text-sm font-medium">
            {formatMarketDate(item.latestMarketDate)}
          </span>
          <span className="text-xs text-muted-foreground">
            Último pregão salvo
          </span>
        </div>
      </td>
      <td className="border-b px-3 py-3 align-top">
        <Badge variant={item.enabled ? "default" : "secondary"}>
          {item.enabled ? "Ativo" : "Pausado"}
        </Badge>
      </td>
      <td className="border-b px-3 py-3 align-top">
        <div className="flex justify-end gap-2">
          <form action={refreshAction}>
            <Button size="sm" type="submit" variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" />
              Atualizar
            </Button>
          </form>
          <Button form={formId} size="sm" type="submit" variant="outline">
            <Save aria-hidden="true" className="size-4" />
            Salvar
          </Button>
          <form action={toggleAction}>
            <Button size="sm" type="submit" variant="secondary">
              {item.enabled ? (
                <Pause aria-hidden="true" className="size-4" />
              ) : (
                <Play aria-hidden="true" className="size-4" />
              )}
              {item.enabled ? "Pausar" : "Ativar"}
            </Button>
          </form>
          <form action={deleteAction}>
            <Button
              aria-label={`Excluir ${item.symbol}`}
              size="icon-sm"
              title={`Excluir ${item.symbol}`}
              type="submit"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function formatMarketDate(marketDate: string | null) {
  if (!marketDate) {
    return "Sem dados";
  }

  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}
