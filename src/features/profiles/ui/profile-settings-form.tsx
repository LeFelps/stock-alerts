"use client";

import { BellRing, Mail } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Profile } from "../domain/profile";
import { updateEmailAlertsPreference } from "../server/update-email-alerts-preference.action";

export function ProfileSettingsForm({
  email,
  profile,
}: {
  email: string;
  profile: Profile;
}) {
  const [draftEnabled, setDraftEnabled] = useState(profile.emailAlertsEnabled);
  const [savedEnabled, setSavedEnabled] = useState(profile.emailAlertsEnabled);
  const [pending, setPending] = useState(false);

  function submitPreference(formData: FormData) {
    if (pending) return;
    const previous = savedEnabled;
    const next = formData.get("emailAlertsEnabled") === "true";
    setSavedEnabled(next);
    setPending(true);

    startTransition(async () => {
      try {
        const result = await updateEmailAlertsPreference(formData);
        if (result.status === "error") {
          setSavedEnabled(previous);
          setDraftEnabled(previous);
          toast.error(
            "Não foi possível salvar as preferências. Tente novamente.",
          );
          return;
        }
        setSavedEnabled(result.data.emailAlertsEnabled);
        setDraftEnabled(result.data.emailAlertsEnabled);
        toast.success("Preferências foram salvas.");
      } catch {
        setSavedEnabled(previous);
        setDraftEnabled(previous);
        toast.error(
          "Não foi possível salvar as preferências. Tente novamente.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 rounded-lg bg-muted/55 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
            <Mail aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Email de acesso</p>
            <p className="truncate pt-1 text-sm text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
      </div>

      <form
        aria-busy={pending}
        className="grid gap-5 rounded-lg border bg-card p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitPreference(new FormData(event.currentTarget));
        }}
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
            variant={savedEnabled ? "secondary" : "outline"}
          >
            {savedEnabled ? "Ativados" : "Desativados"}
          </Badge>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border bg-background p-4">
          <span className="grid gap-1">
            <span className="text-sm font-medium">Alertas por email</span>
            <span className="text-sm leading-6 text-muted-foreground">
              Ative ou pause os emails enviados para este Perfil.
            </span>
          </span>
          <input
            className="peer sr-only"
            checked={draftEnabled}
            disabled={pending}
            name="emailAlertsEnabled"
            onChange={(event) => setDraftEnabled(event.target.checked)}
            type="checkbox"
            value="true"
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
          />
        </label>

        <div>
          <Button disabled={pending} type="submit">
            {pending ? "Salvando…" : "Salvar preferências"}
          </Button>
        </div>
      </form>
    </section>
  );
}
