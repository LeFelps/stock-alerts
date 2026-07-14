import { BellRing, ChartNoAxesCombined, ListPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { signInWithGoogle } from "@/app/actions";
import { auth } from "@/auth";
import { SignInSubmitButton } from "@/components/action-submit-button";

type HomeProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

const emptySearchParams: Awaited<NonNullable<HomeProps["searchParams"]>> = {
  error: undefined,
};

export default async function Home({ searchParams }: HomeProps = {}) {
  const [session, query] = await Promise.all([
    auth(),
    searchParams ?? Promise.resolve(emptySearchParams),
  ]);

  if (session?.user) {
    redirect("/dashboard");
  }

  const hasSignInError = Boolean(query.error);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
        <section className="grid content-center gap-8">
          <div className="grid gap-6">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Stock Alerts
            </h1>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Entrar no painel
            </h2>
          </div>

          <div className="max-w-2xl">
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Acompanhe preços, indicadores e sinais de compra dos seus ativos
              em um só lugar.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="grid content-start gap-2 rounded-md border bg-card p-4">
              <ListPlus aria-hidden="true" className="size-5 text-primary" />
              <h3 className="font-semibold">Configure</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Adicione ativos à sua lista de acompanhamento e ajuste suas
                preferências.
              </p>
            </li>
            <li className="grid content-start gap-2 rounded-md border bg-card p-4">
              <ChartNoAxesCombined
                aria-hidden="true"
                className="size-5 text-primary"
              />
              <h3 className="font-semibold">Monitore</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Acompanhe preços, indicadores e sinais dos seus ativos.
              </p>
            </li>
            <li className="grid content-start gap-2 rounded-md border bg-card p-4">
              <BellRing aria-hidden="true" className="size-5 text-primary" />
              <h3 className="font-semibold">Receba alertas</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Receba alertas por email quando novos sinais de compra forem
                detectados.
              </p>
            </li>
          </ol>
        </section>

        <section className="grid content-center gap-5 rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold">Acesso Google</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Use uma conta Google autorizada para continuar para o painel.
            </p>
          </div>

          {hasSignInError && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
              Não foi possível entrar com essa conta. Verifique se o email está
              liberado.
            </p>
          )}

          <form action={signInWithGoogle}>
            <SignInSubmitButton />
          </form>
        </section>
      </div>
    </main>
  );
}
