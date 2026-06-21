import { BellRing, Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
import { updateEmailAlertsPreference } from "@/app/dashboard/settings/actions";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect("/");
  }

  const [userSettings] = await db
    .select({ emailAlertsEnabled: users.emailAlertsEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userSettings) {
    redirect("/");
  }

  return (
    <DashboardShell activeSection="settings" userEmail={session.user.email}>
      <section className="grid gap-6">
        <SectionHeader
          title="Configurações"
          description="Controle as preferências da sua conta e dos emails de alerta."
        />

        <div className="grid gap-4 rounded-lg bg-muted/55 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
              <Mail aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Email de acesso</p>
              <p className="truncate pt-1 text-sm text-muted-foreground">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>

        <form
          action={updateEmailAlertsPreference}
          className="grid gap-5 rounded-lg border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                <BellRing aria-hidden="true" className="size-5" />
              </div>
              <div className="grid gap-1">
                <h2 className="text-lg font-semibold">Alertas por email</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Receber emails quando uma Regra de alerta gerar um Alerta.
                </p>
              </div>
            </div>
            <Badge
              className="w-fit"
              variant={
                userSettings.emailAlertsEnabled ? "secondary" : "outline"
              }
            >
              {userSettings.emailAlertsEnabled ? "Ativados" : "Desativados"}
            </Badge>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border bg-background p-4">
            <span className="grid gap-1">
              <span className="text-sm font-medium">Alertas por email</span>
              <span className="text-sm leading-6 text-muted-foreground">
                Ative ou pause os emails enviados para esta conta.
              </span>
            </span>
            <input
              className="peer sr-only"
              defaultChecked={userSettings.emailAlertsEnabled}
              name="emailAlertsEnabled"
              type="checkbox"
              value="true"
            />
            <span
              aria-hidden="true"
              className="relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
            />
          </label>

          <div>
            <Button type="submit">Salvar preferências</Button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
