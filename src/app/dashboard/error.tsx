"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <section className="grid min-h-80 place-items-center rounded-lg bg-muted/30 px-4 text-foreground">
      <div className="grid max-w-md gap-4 text-center" role="alert">
        <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">
          Não foi possível carregar o painel.
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Tente novamente. Se o erro persistir, verifique a conexão com o banco
          e as variáveis de ambiente.
        </p>
        <Button className="mx-auto" onClick={reset} type="button">
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}
