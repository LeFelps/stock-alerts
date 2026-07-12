"use client";

import {
  Bell,
  Clock3,
  LineChart,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardSection =
  | "jobs"
  | "overview"
  | "preferences"
  | "settings"
  | "signals";

type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  section: DashboardSection;
};

const navItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    icon: LineChart,
    label: "Dashboard",
    section: "overview",
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Configurações",
    section: "settings",
  },
  {
    href: "/dashboard/preferences",
    icon: SlidersHorizontal,
    label: "Preferências",
    section: "preferences",
  },
  {
    href: "/dashboard/signals",
    icon: Bell,
    label: "Sinais",
    section: "signals",
  },
  {
    href: "/dashboard/jobs",
    icon: Clock3,
    label: "Execuções",
    section: "jobs",
  },
];

export function DashboardNavigation({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  return (
    <nav aria-label={ariaLabel} className={cn("grid gap-1.5", className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.section === activeSection;

        return (
          <Button
            asChild
            className={cn(
              "justify-start px-3 text-muted-foreground",
              active &&
                "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
            key={item.href}
            variant="ghost"
          >
            <Link aria-current={active ? "page" : undefined} href={item.href}>
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function getActiveSection(pathname: string): DashboardSection {
  if (pathname === "/dashboard/settings") return "settings";
  if (pathname === "/dashboard/preferences") return "preferences";
  if (pathname === "/dashboard/signals") return "signals";
  if (pathname === "/dashboard/jobs") return "jobs";
  return "overview";
}
