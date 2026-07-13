import type { ReactNode } from "react";
import Link from "next/link";

import { signOutUser } from "@/app/actions";
import { SignOutSubmitButton } from "@/components/action-submit-button";
import { DashboardNavigation } from "./dashboard-navigation";
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <DashboardHeader userEmail={userEmail} />

        <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[14rem_1fr]">
          <DesktopSidebarNav />

          <section className="grid min-w-0 content-start gap-10">
            {children}
          </section>
        </div>
      </div>
    </main>
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
        <MobileNavDrawer />
      </div>
    </header>
  );
}

function DesktopSidebarNav() {
  return (
    <aside className="hidden lg:block">
      <DashboardNavigation ariaLabel="Seções do painel" />
    </aside>
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
