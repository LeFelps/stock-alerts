"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Ellipsis,
  LoaderCircle,
  MessageSquareText,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { startTransition, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { ActionError } from "@/lib/action-result";

import type { WatchlistItem } from "../domain/watchlist-item";
import { AssetLogo } from "./asset-logo";
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

type OptimisticItem = Omit<WatchlistItem, "id"> & { id: string };
type ItemOperation = "delete" | "edit" | "toggle";

export function WatchlistManagement({ items }: { items: WatchlistItem[] }) {
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

        setRows((current) => [...current, result.data]);
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
          current.map((row) => (row.id === item.id ? result.data : row)),
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
          current.map((row) => (row.id === item.id ? result.data : row)),
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

  const columns = createWatchlistColumns({
    onDelete: submitDelete,
    onEdit: submitEdit,
    onToggle: submitToggle,
    operations,
  });

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
        <EmptyState
          description="Adicione um Ativo para começar a monitorá-lo."
          title="A Lista de acompanhamento está vazia."
        />
      ) : (
        <DataTable
          columnLabels={watchlistColumnLabels}
          columns={columns}
          data={rows}
          getRowId={(item) => item.id}
          searchPlaceholder="Buscar ativos…"
        />
      )}
    </div>
  );
}

type WatchlistColumnDependencies = {
  onDelete: (item: OptimisticItem) => void;
  onEdit: (item: OptimisticItem, draft: WatchlistEditFields) => void;
  onToggle: (item: OptimisticItem) => void;
  operations: Record<string, ItemOperation>;
};

function createWatchlistColumns({
  onDelete,
  onEdit,
  onToggle,
  operations,
}: WatchlistColumnDependencies): ColumnDef<OptimisticItem>[] {
  return [
    {
      cell: ({ row }) => <AssetLogo item={row.original} />,
      enableHiding: false,
      header: "Ícone",
      id: "icon",
    },
    {
      accessorKey: "symbol",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.symbol}</span>
      ),
      header: "Código",
    },
    {
      accessorFn: (item) => item.longName ?? item.symbol,
      cell: ({ row }) => (
        <span
          className="block max-w-64 truncate"
          title={row.original.longName ?? row.original.symbol}
        >
          {row.original.longName ?? row.original.symbol}
        </span>
      ),
      header: "Nome",
      id: "name",
    },
    {
      accessorFn: (item) => item.notes ?? "Sem observações",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ObservationHoverCard
            notes={row.original.notes}
            symbol={row.original.symbol}
          />
        </div>
      ),
      header: () => <div className="text-center">Observações</div>,
      id: "notes",
    },
    {
      accessorFn: (item) => (item.enabled ? "Ativo" : "Pausado"),
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={row.original.enabled ? "default" : "secondary"}>
            {row.original.enabled ? "Ativo" : "Pausado"}
          </Badge>
        </div>
      ),
      header: () => <div className="text-center">Status</div>,
      id: "status",
    },
    {
      cell: ({ row }) => {
        const item = row.original;
        const operation = operations[item.id];
        return (
          <WatchlistItemActions
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onToggle}
            operation={operation}
          />
        );
      },
      enableHiding: false,
      header: () => <div className="text-right">Ações</div>,
      id: "actions",
    },
  ];
}

const watchlistColumnLabels = {
  name: "Nome",
  notes: "Observações",
  status: "Status",
  symbol: "Código",
};

function WatchlistItemActions({
  item,
  onDelete,
  onEdit,
  onToggle,
  operation,
}: {
  item: OptimisticItem;
  onDelete: (item: OptimisticItem) => void;
  onEdit: (item: OptimisticItem, draft: WatchlistEditFields) => void;
  onToggle: (item: OptimisticItem) => void;
  operation?: ItemOperation;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const disabled = Boolean(operation);
  const toggleLabel = item.enabled
    ? `Pausar ${item.symbol}`
    : `Ativar ${item.symbol}`;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        aria-label={
          operation === "toggle" ? `Salvando ${item.symbol}` : toggleLabel
        }
        disabled={disabled}
        onClick={() => onToggle(item)}
        size="sm"
        title={toggleLabel}
        type="button"
        variant="secondary"
      >
        {operation === "toggle" ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Mais ações para ${item.symbol}`}
            disabled={disabled}
            ref={menuTriggerRef}
            size="icon-sm"
            title={`Mais ações para ${item.symbol}`}
            type="button"
            variant="ghost"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (!openingDialog.current) return;
            event.preventDefault();
            openingDialog.current = false;
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              openingDialog.current = true;
              window.setTimeout(() => setEditOpen(true), 0);
            }}
          >
            <Pencil aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              openingDialog.current = true;
              window.setTimeout(() => setDeleteOpen(true), 0);
            }}
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditWatchlistItemDialog
        item={item}
        onOpenChange={setEditOpen}
        onSubmit={onEdit}
        open={editOpen}
        pending={operation === "edit"}
        returnFocusRef={menuTriggerRef}
      />
      <DeleteWatchlistItemDialog
        disabled={disabled}
        item={item}
        onConfirm={onDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        returnFocusRef={menuTriggerRef}
      />
    </div>
  );
}

function DeleteWatchlistItemDialog({
  disabled,
  item,
  onConfirm,
  onOpenChange,
  open,
  returnFocusRef,
}: {
  disabled: boolean;
  item: OptimisticItem;
  onConfirm: (item: OptimisticItem) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
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
            disabled={disabled}
            onClick={() => {
              onOpenChange(false);
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
  item,
  onOpenChange,
  onSubmit,
  open,
  pending,
  returnFocusRef,
}: {
  item: OptimisticItem;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: OptimisticItem, draft: WatchlistEditFields) => void;
  open: boolean;
  pending: boolean;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [draft, setDraft] = useState<WatchlistEditFields>({
    notes: item.notes,
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEditFields(new FormData(event.currentTarget));
    setDraft(normalized);
    onOpenChange(false);
    onSubmit(item, normalized);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
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
