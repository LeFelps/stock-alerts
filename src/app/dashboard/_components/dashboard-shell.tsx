import type { ReactNode } from "react";
import {
  Bell,
  Clock3,
  LineChart,
  LogOut,
  Menu,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { signOutUser } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DashboardSection = "jobs" | "overview" | "settings" | "signals";

type DashboardNavItem = {
  label: string;
  icon: LucideIcon;
  section?: DashboardSection;
  href?: string;
};

const navItems: DashboardNavItem[] = [
  {
    label: "Visão geral",
    icon: LineChart,
    section: "overview",
    href: "/dashboard",
  },
  {
    label: "Sinais",
    icon: Bell,
    section: "signals",
    href: "/dashboard/signals",
  },
  {
    label: "Execuções",
    icon: Clock3,
    section: "jobs",
    href: "/dashboard/jobs",
  },
  {
    label: "Configurações",
    icon: Settings,
    section: "settings",
    href: "/dashboard/settings",
  },
];

export function DashboardShell({
  activeSection,
  userEmail,
  children,
}: {
  activeSection: DashboardSection;
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <DashboardHeader activeSection={activeSection} userEmail={userEmail} />

        <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[14rem_1fr]">
          <DesktopSidebarNav activeSection={activeSection} />

          <section className="grid content-start gap-10">{children}</section>
        </div>
      </div>
    </main>
  );
}

function DashboardHeader({
  activeSection,
  userEmail,
}: {
  activeSection: DashboardSection;
  userEmail: string;
}) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4">
      <Link className="flex items-center gap-3" href="/dashboard">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LineChart aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Alertas de Ativos
          </p>
          <h1 className="text-xl font-semibold">Painel</h1>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <span className="hidden max-w-56 truncate text-sm text-muted-foreground md:inline">
          {userEmail}
        </span>
        <Button
          asChild
          className="hidden sm:inline-flex"
          variant="outline"
          size="sm"
        >
          <Link href="/dashboard/settings">
            <Settings aria-hidden="true" className="size-4" />
            Configurações
          </Link>
        </Button>
        <form action={signOutUser}>
          <Button aria-label="Sair" size="icon" type="submit" variant="outline">
            <LogOut aria-hidden="true" className="size-4" />
          </Button>
        </form>
        <MobileNavDrawer activeSection={activeSection} />
      </div>
    </header>
  );
}

function DesktopSidebarNav({
  activeSection,
}: {
  activeSection: DashboardSection;
}) {
  return (
    <aside className="hidden lg:block">
      <DashboardNav
        activeSection={activeSection}
        ariaLabel="Seções do painel"
      />
    </aside>
  );
}

function MobileNavDrawer({
  activeSection,
}: {
  activeSection: DashboardSection;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir navegação"
          className="lg:hidden"
          size="icon"
          variant="outline"
        >
          <Menu aria-hidden="true" className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Alertas de Ativos</SheetTitle>
        </SheetHeader>
        <DashboardNav
          activeSection={activeSection}
          ariaLabel="Navegação principal"
          className="pt-6"
        />
      </SheetContent>
    </Sheet>
  );
}

function DashboardNav({
  activeSection,
  ariaLabel,
  className,
}: {
  activeSection?: DashboardSection;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("grid gap-1.5", className)}>
      {navItems.map((item) => (
        <DashboardNavButton
          active={item.section === activeSection}
          item={item}
          key={item.label}
        />
      ))}
    </nav>
  );
}

function DashboardNavButton({
  active,
  item,
}: {
  active: boolean;
  item: DashboardNavItem;
}) {
  const Icon = item.icon;
  const className = cn(
    "justify-start px-3 text-muted-foreground",
    active &&
      "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
  );

  if (!item.href) {
    return (
      <Button className={className} disabled type="button" variant="ghost">
        <Icon aria-hidden="true" className="size-4" />
        {item.label}
      </Button>
    );
  }

  return (
    <Button asChild className={className} variant="ghost">
      <Link href={item.href}>
        <Icon aria-hidden="true" className="size-4" />
        {item.label}
      </Link>
    </Button>
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
