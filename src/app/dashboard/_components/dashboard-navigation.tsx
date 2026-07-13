"use client";

import {
  Activity,
  Bell,
  Clock3,
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
    icon: Activity,
    label: "Monitoramento",
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
  canAccessJobs = false,
  className,
  onNavigate,
  variant = "stacked",
}: {
  ariaLabel: string;
  canAccessJobs?: boolean;
  className?: string;
  onNavigate?: () => void;
  variant?: "stacked" | "tabs";
}) {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        variant === "tabs"
          ? "flex items-center justify-start gap-0 overflow-hidden rounded-xl border bg-card shadow-sm lg:gap-1"
          : "grid gap-1.5",
        className,
      )}
    >
      {navItems
        .filter((item) => item.section !== "jobs" || canAccessJobs)
        .map((item) => {
          const Icon = item.icon;
          const active = item.section === activeSection;

          return (
            <Button
              asChild
              className={cn(
                variant === "tabs"
                  ? "relative size-14 shrink-0 rounded-none p-0 text-muted-foreground hover:bg-muted/50 lg:h-14 lg:w-auto lg:px-4"
                  : "justify-start px-3 text-muted-foreground",
                active && variant === "tabs"
                  ? "bg-transparent font-semibold text-foreground hover:bg-muted/50 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                  : active &&
                      "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
              )}
              key={item.href}
              variant="ghost"
            >
              <Link
                aria-label={variant === "tabs" ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                href={item.href}
                onNavigate={onNavigate}
                title={variant === "tabs" ? item.label : undefined}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4",
                    variant === "tabs" && "size-5 lg:hidden",
                  )}
                />
                {variant === "tabs" ? (
                  <span aria-hidden="true" className="hidden lg:inline">
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
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
