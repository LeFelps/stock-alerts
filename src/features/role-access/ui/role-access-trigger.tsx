"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { unlockSuperAccess } from "../server/unlock-super-access.action";

const requiredPresses = 5;
const pressSequenceTimeoutMs = 2_000;

export function RoleAccessTrigger({
  email,
  isSuper,
}: {
  email: string;
  isSuper: boolean;
}) {
  const router = useRouter();
  const presses = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => () => {
      clearTimeout(resetTimer.current);
    },
    [],
  );

  function registerPress() {
    presses.current += 1;
    clearTimeout(resetTimer.current);

    if (presses.current >= requiredPresses) {
      presses.current = 0;

      if (isSuper) {
        toast.info("Você já possui acesso superior.");
        return;
      }

      setError(undefined);
      setOpen(true);
      return;
    }

    resetTimer.current = setTimeout(() => {
      presses.current = 0;
    }, pressSequenceTimeoutMs);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      try {
        const result = await unlockSuperAccess(formData);

        if (result.status === "error") {
          setError(
            result.error === "not_configured"
              ? "O acesso protegido não está configurado."
              : result.error === "validation_error"
                ? "Informe a senha."
                : "Senha incorreta.",
          );
          return;
        }

        setOpen(false);
        toast.success("Acesso superior liberado.");
        router.refresh();
      } catch {
        setError("Não foi possível validar a senha. Tente novamente.");
      }
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
      open={open}
    >
      <button
        className="block max-w-[25vw] cursor-default select-none truncate rounded-sm text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:max-w-56"
        onClick={registerPress}
        type="button"
      >
        {email}
      </button>

      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Acesso superior</DialogTitle>
          <DialogDescription>
            Informe a senha para obter acesso superior.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" id="role-access-form" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Senha
            <Input
              aria-describedby={error ? "role-access-error" : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="current-password"
              autoFocus
              disabled={pending}
              maxLength={256}
              name="password"
              required
              type="password"
            />
          </label>
          {error ? (
            <p
              className="text-sm text-red-700 dark:text-red-400"
              id="role-access-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button disabled={pending} form="role-access-form" type="submit">
            {pending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <LockKeyhole aria-hidden="true" className="size-4" />
            )}
            {pending ? "Validando…" : "Acessar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
