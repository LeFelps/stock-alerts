"use client";

import { LoaderCircle, LogIn, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SignInSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      className="w-full"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <LogIn aria-hidden="true" className="size-4" />
      )}
      {pending ? "Entrando…" : "Entrar com Google"}
    </Button>
  );
}

export function SignOutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      aria-label={pending ? "Saindo…" : "Sair"}
      disabled={pending}
      size="icon"
      title={pending ? "Saindo…" : "Sair"}
      type="submit"
      variant="outline"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
