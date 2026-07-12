"use client";

import {
  LoaderCircle,
  MessageSquareText,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { startTransition, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Table } from "@/components/ui/table";
import { refreshWatchlistItemMarketData } from "@/features/market-data/server/market-data.actions";
import type { ActionError } from "@/lib/action-result";
import { formatHumanDate } from "@/lib/format-date";

import type { WatchlistItem } from "../domain/watchlist-item";
import {
  createWatchlistItem,
  deleteWatchlistItem,
  setWatchlistItemEnabled,
  updateWatchlistItem,
} from "../server/watchlist.actions";

const fieldClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName =
  "min-h-10 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

export type WatchlistManagementItem = WatchlistItem & {
  latestMarketDate: string | null;
};

type OptimisticItem = Omit<WatchlistManagementItem, "id"> & { id: string };
type ItemOperation = "delete" | "edit" | "refresh" | "toggle";

export function WatchlistManagement({
  items,
  referenceDate,
}: {
  items: WatchlistManagementItem[];
  referenceDate: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [rows, setRows] = useState<OptimisticItem[]>(items);
  const [adding, setAdding] = useState(false);
  const [operations, setOperations] = useState<Record<string, ItemOperation>>(
    {},
  );

  function setOperation(id: string, operation?: ItemOperation) {
    setOperations((current) => {
      const next = { ...current };
      if (operation) next[id] = operation;
      else delete next[id];
      return next;
    });
  }

  function submitCreate(formData: FormData) {
    if (adding) return;

    const submitted = normalizeCreateFields(formData);

    setAdding(true);

    startTransition(async () => {
      try {
        const result = await createWatchlistItem(formData);
        if (result.status === "error") {
          toast.error(actionErrorMessage(result.error, submitted.symbol));
          return;
        }

        setRows((current) => [
          ...current,
          { ...result.data, latestMarketDate: null },
        ]);
        formRef.current?.reset();
        toast.success(
          `${result.data.symbol} foi adicionado à Lista de acompanhamento.`,
        );
      } catch {
        toast.error("Não foi possível adicionar o Ativo. Tente novamente.");
      } finally {
        setAdding(false);
      }
    });
  }

  function submitEdit(item: OptimisticItem, draft: WatchlistEditFields) {
    if (operations[item.id]) return;
    const previous = item;
    const formData = editFieldsToFormData(draft);

    setOperation(item.id, "edit");
    setRows((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, ...draft, updatedAt: new Date() } : row,
      ),
    );

    startTransition(async () => {
      try {
        const result = await updateWatchlistItem(item.id, formData);
        if (result.status === "error") {
          setRows((current) =>
            current.map((row) => (row.id === item.id ? previous : row)),
          );
          toast.error(actionErrorMessage(result.error, item.symbol));
          return;
        }

        setRows((current) =>
          current.map((row) =>
            row.id === item.id
              ? { ...result.data, latestMarketDate: row.latestMarketDate }
              : row,
          ),
        );
        toast.success(`Alterações de ${result.data.symbol} foram salvas.`);
      } catch {
        setRows((current) =>
          current.map((row) => (row.id === item.id ? previous : row)),
        );
        toast.error("Não foi possível salvar as alterações. Tente novamente.");
      } finally {
        setOperation(item.id);
      }
    });
  }

  function submitToggle(item: OptimisticItem) {
    if (operations[item.id]) return;
    const enabled = !item.enabled;

    setOperation(item.id, "toggle");
    setRows((current) =>
      current.map((row) => (row.id === item.id ? { ...row, enabled } : row)),
    );

    startTransition(async () => {
      try {
        const result = await setWatchlistItemEnabled(item.id, enabled);
        if (result.status === "error") {
          setRows((current) =>
            current.map((row) =>
              row.id === item.id ? { ...row, enabled: item.enabled } : row,
            ),
          );
          toast.error(actionErrorMessage(result.error, item.symbol));
          return;
        }

        setRows((current) =>
          current.map((row) =>
            row.id === item.id
              ? { ...result.data, latestMarketDate: row.latestMarketDate }
              : row,
          ),
        );
        toast.success(
          `${result.data.symbol} foi ${enabled ? "ativado" : "pausado"}.`,
        );
      } catch {
        setRows((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, enabled: item.enabled } : row,
          ),
        );
        toast.error(
          `Não foi possível alterar ${item.symbol}. Tente novamente.`,
        );
      } finally {
        setOperation(item.id);
      }
    });
  }

  function submitDelete(item: OptimisticItem) {
    if (operations[item.id]) return;
    const index = rows.findIndex((row) => row.id === item.id);

    setOperation(item.id, "delete");
    setRows((current) => current.filter((row) => row.id !== item.id));

    startTransition(async () => {
      try {
        const result = await deleteWatchlistItem(item.id);
        if (result.status === "error") {
          restoreRow(setRows, item, index);
          toast.error(actionErrorMessage(result.error, item.symbol));
          return;
        }
        toast.success(`${item.symbol} foi excluído.`);
      } catch {
        restoreRow(setRows, item, index);
        toast.error(
          `Não foi possível excluir ${item.symbol}. Tente novamente.`,
        );
      } finally {
        setOperation(item.id);
      }
    });
  }

  function submitRefresh(item: OptimisticItem) {
    if (operations[item.id]) return;
    setOperation(item.id, "refresh");

    startTransition(async () => {
      try {
        const result = await refreshWatchlistItemMarketData(item.id);
        if (result.status === "error") {
          toast.error(actionErrorMessage(result.error, item.symbol));
          return;
        }
        toast.success(`Dados de ${item.symbol} foram atualizados.`);
      } catch {
        toast.error(
          `Não foi possível atualizar os dados de ${item.symbol}. Tente novamente.`,
        );
      } finally {
        setOperation(item.id);
      }
    });
  }

  return (
    <div className="grid gap-8">
      <form
        aria-busy={adding}
        className="grid items-end gap-4 border-b pb-8 md:grid-cols-[minmax(8rem,0.7fr)_minmax(16rem,1.5fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          submitCreate(new FormData(event.currentTarget));
        }}
        ref={formRef}
      >
        <label className="grid gap-2 text-sm font-medium">
          Código
          <input
            className={fieldClassName}
            disabled={adding}
            maxLength={12}
            name="symbol"
            placeholder="PETR4"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Observações
          <input
            className={fieldClassName}
            disabled={adding}
            maxLength={1000}
            name="notes"
            placeholder="Contexto para acompanhar este ativo"
          />
        </label>
        <Button aria-busy={adding} disabled={adding} type="submit">
          {adding ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {adding ? "Validando…" : "Adicionar ativo"}
        </Button>
      </form>

      {rows.length === 0 ? (
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
              <th className="w-12 border-b px-3 py-3 font-medium">
                <span className="sr-only">Logo</span>
              </th>
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
            {rows.map((item) => (
              <WatchlistRow
                item={item}
                key={item.id}
                onDelete={submitDelete}
                onEdit={submitEdit}
                onRefresh={submitRefresh}
                onToggle={submitToggle}
                operation={operations[item.id]}
                referenceDate={referenceDate}
              />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function WatchlistRow({
  item,
  onDelete,
  onEdit,
  onRefresh,
  onToggle,
  operation,
  referenceDate,
}: {
  item: OptimisticItem;
  onDelete: (item: OptimisticItem) => void;
  onEdit: (item: OptimisticItem, draft: WatchlistEditFields) => void;
  onRefresh: (item: OptimisticItem) => void;
  onToggle: (item: OptimisticItem) => void;
  operation?: ItemOperation;
  referenceDate: string;
}) {
  const disabled = Boolean(operation);

  return (
    <tr aria-busy={disabled || undefined}>
      <td className="w-12 border-b px-3 py-3">
        <AssetLogo item={item} />
      </td>
      <td className="border-b px-3 py-3 font-medium">{item.symbol}</td>
      <td className="max-w-64 border-b px-3 py-3">
        <span
          className="block max-w-64 truncate"
          title={item.longName ?? item.symbol}
        >
          {item.longName ?? item.symbol}
        </span>
      </td>
      <td className="border-b px-3 py-3 align-top">
        <ObservationHoverCard notes={item.notes} symbol={item.symbol} />
      </td>
      <td className="border-b px-3 py-3 align-top">
        <div className="grid gap-1">
          <span className="text-sm font-medium">
            {item.latestMarketDate
              ? formatHumanDate(item.latestMarketDate, referenceDate)
              : "Sem dados"}
          </span>
          <span className="text-xs text-muted-foreground">
            Última atualização
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
          <Button
            aria-busy={operation === "refresh"}
            disabled={disabled}
            onClick={() => onRefresh(item)}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw
              aria-hidden="true"
              className={
                operation === "refresh" ? "size-4 animate-spin" : "size-4"
              }
            />
            {operation === "refresh" ? "Atualizando…" : "Atualizar"}
          </Button>
          <EditWatchlistItemDialog
            disabled={disabled}
            item={item}
            onSubmit={onEdit}
            pending={operation === "edit"}
          />
          <Button
            disabled={disabled}
            onClick={() => onToggle(item)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {operation === "toggle" ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : item.enabled ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            {operation === "toggle"
              ? "Salvando…"
              : item.enabled
                ? "Pausar"
                : "Ativar"}
          </Button>
          <DeleteWatchlistItemDialog
            disabled={disabled}
            item={item}
            onConfirm={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

function AssetLogo({ item }: { item: OptimisticItem }) {
  if (!item.logoUrl) {
    return (
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground"
      >
        {item.symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      alt=""
      className="size-8 rounded-md object-contain"
      height={32}
      src={item.logoUrl}
      unoptimized
      width={32}
    />
  );
}

function DeleteWatchlistItemDialog({
  disabled,
  item,
  onConfirm,
}: {
  disabled: boolean;
  item: OptimisticItem;
  onConfirm: (item: OptimisticItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Excluir ${item.symbol}`}
          disabled={disabled}
          size="icon-sm"
          title={`Excluir ${item.symbol}`}
          type="button"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {item.symbol}?</DialogTitle>
          <DialogDescription>
            Este Ativo será removido da Lista de acompanhamento.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              setOpen(false);
              onConfirm(item);
            }}
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Excluir Ativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObservationHoverCard({
  notes,
  symbol,
}: {
  notes: string | null;
  symbol: string;
}) {
  const descriptionId = useId();
  if (!notes)
    return (
      <Button
        aria-label={`Sem observações de ${symbol}`}
        className="text-muted-foreground"
        disabled
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <MessageSquareText aria-hidden="true" className="size-4" />
      </Button>
    );
  return (
    <>
      <span className="sr-only" id={descriptionId}>
        {notes}
      </span>
      <HoverCard closeDelay={100} openDelay={200}>
        <HoverCardTrigger asChild>
          <Button
            aria-describedby={descriptionId}
            aria-label={`Ver observações de ${symbol}`}
            className="text-muted-foreground"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MessageSquareText aria-hidden="true" className="size-4" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          collisionPadding={16}
          role="tooltip"
          side="top"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Observação
          </p>
          <p className="whitespace-pre-wrap pt-2 text-sm leading-5">{notes}</p>
        </HoverCardContent>
      </HoverCard>
    </>
  );
}

type WatchlistCreateFields = {
  notes: string | null;
  symbol: string;
};

type WatchlistEditFields = Pick<WatchlistCreateFields, "notes">;

function EditWatchlistItemDialog({
  disabled,
  item,
  onSubmit,
  pending,
}: {
  disabled: boolean;
  item: OptimisticItem;
  onSubmit: (item: OptimisticItem, draft: WatchlistEditFields) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WatchlistEditFields>({
    notes: item.notes,
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEditFields(new FormData(event.currentTarget));
    setDraft(normalized);
    setOpen(false);
    onSubmit(item, normalized);
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size="sm" type="button" variant="outline">
          <Pencil aria-hidden="true" className="size-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {item.symbol}</DialogTitle>
          <DialogDescription>
            Atualize os dados deste Ativo na Lista de acompanhamento.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          id={`watchlist-item-${item.id}`}
          onSubmit={submit}
        >
          <dl className="grid grid-cols-2 gap-4 rounded-md bg-muted/50 p-4 text-sm">
            <div className="grid gap-1">
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-medium">{item.symbol}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{item.longName ?? item.symbol}</dd>
            </div>
          </dl>
          <label className="grid gap-2 text-sm font-medium">
            Observações
            <textarea
              className={textareaClassName}
              defaultValue={draft.notes ?? ""}
              disabled={pending}
              maxLength={1000}
              name="notes"
              rows={4}
            />
          </label>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            disabled={pending}
            form={`watchlist-item-${item.id}`}
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeCreateFields(formData: FormData): WatchlistCreateFields {
  const optional = (name: string) => {
    const value = formData.get(name);
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized || null;
  };
  const rawSymbol = formData.get("symbol");
  return {
    notes: optional("notes"),
    symbol:
      typeof rawSymbol === "string"
        ? rawSymbol.trim().replace(/\s+/g, "").toUpperCase()
        : "",
  };
}

function normalizeEditFields(formData: FormData): WatchlistEditFields {
  const notes = formData.get("notes");
  const normalized = typeof notes === "string" ? notes.trim() : "";
  return { notes: normalized || null };
}

function editFieldsToFormData(fields: WatchlistEditFields) {
  const formData = new FormData();
  formData.set("notes", fields.notes ?? "");
  return formData;
}

function restoreRow(
  setRows: React.Dispatch<React.SetStateAction<OptimisticItem[]>>,
  item: OptimisticItem,
  index: number,
) {
  setRows((current) => {
    if (current.some((row) => row.id === item.id)) return current;
    const next = [...current];
    next.splice(Math.max(0, index), 0, item);
    return next;
  });
}

function actionErrorMessage(error: ActionError, symbol: string) {
  if (error === "duplicate_symbol")
    return `${symbol} já está na Lista de acompanhamento.`;
  if (error === "invalid_symbol")
    return `${symbol} não é um Código de Ativo válido.`;
  if (error === "provider_error")
    return `Não foi possível validar ${symbol} agora. Tente novamente.`;
  if (error === "validation_error")
    return "Revise os dados informados e tente novamente.";
  if (error === "not_found")
    return `${symbol} não foi encontrado na Lista de acompanhamento.`;
  return `Não foi possível concluir a ação para ${symbol}. Tente novamente.`;
}
