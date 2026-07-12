import { LineChart, LogIn, ShieldCheck } from "lucide-react";
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
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Alertas de Ativos
              </p>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Entrar no painel
              </h1>
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Acesse seu painel protegido para acompanhar ativos, preparar
              regras de alerta e conectar os próximos fluxos do MVP.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border bg-card p-4">
              <ShieldCheck
                aria-hidden="true"
                className="mb-3 size-5 text-primary"
              />
              Sessões protegidas por conta Google.
            </div>
            <div className="rounded-md border bg-card p-4">
              <LineChart
                aria-hidden="true"
                className="mb-3 size-5 text-primary"
              />
              Lista de acompanhamento preparada para dados reais.
            </div>
            <div className="rounded-md border bg-card p-4">
              <LogIn aria-hidden="true" className="mb-3 size-5 text-primary" />
              Entrada restrita por email quando configurada.
            </div>
          </div>
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
