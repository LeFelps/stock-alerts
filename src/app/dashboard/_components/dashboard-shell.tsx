import type { ReactNode } from "react";
import Link from "next/link";

import { signOutUser } from "@/app/actions";
import { SignOutSubmitButton } from "@/components/action-submit-button";
import { DashboardNavigation } from "./dashboard-navigation";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <DashboardHeader userEmail={userEmail} />

        <div className="grid flex-1 content-start gap-6 pb-8 pt-8">
          <DashboardTabsNav />
          <main className="grid min-w-0 content-start gap-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4">
      <Link className="flex items-center gap-3" href="/dashboard">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Stock Alerts
        </h1>
      </Link>

      <div className="flex items-center gap-2">
        <span className="hidden max-w-56 truncate text-sm text-muted-foreground md:inline">
          {userEmail}
        </span>
        <form action={signOutUser}>
          <SignOutSubmitButton />
        </form>
      </div>
    </header>
  );
}

function DashboardTabsNav() {
  return (
    <div>
      <DashboardNavigation ariaLabel="Seções do painel" variant="tabs" />
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
