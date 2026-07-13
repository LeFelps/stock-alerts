import type { ReactNode } from "react";
import Link from "next/link";

import { signOutUser } from "@/app/actions";
import { SignOutSubmitButton } from "@/components/action-submit-button";
import { RoleAccessTrigger } from "@/features/role-access/ui/role-access-trigger";
import { DashboardNavigation } from "./dashboard-navigation";

export function DashboardShell({
  isSuper,
  userEmail,
  children,
}: {
  isSuper: boolean;
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <DashboardHeader isSuper={isSuper} userEmail={userEmail} />

        <div className="grid flex-1 content-start gap-6 pb-24 pt-4 lg:pb-8">
          <DashboardTabsNav canAccessJobs={isSuper} />
          <main className="grid min-w-0 content-start gap-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({
  isSuper,
  userEmail,
}: {
  isSuper: boolean;
  userEmail: string;
}) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4">
      <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-3xl">
          Stock Alerts
        </h1>
      </Link>

      <div className="flex min-w-0 items-center gap-2">
        <RoleAccessTrigger email={userEmail} isSuper={isSuper} />
        <form action={signOutUser}>
          <SignOutSubmitButton />
        </form>
      </div>
    </header>
  );
}

function DashboardTabsNav({ canAccessJobs }: { canAccessJobs: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:static lg:block lg:px-0">
      <DashboardNavigation
        ariaLabel="Seções do painel"
        canAccessJobs={canAccessJobs}
        className="w-fit max-w-full lg:w-full"
        variant="tabs"
      />
    </div>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
