import type { ReactNode } from "react";

import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentProfile = await requireCurrentProfile();

  return (
    <DashboardShell userEmail={currentProfile.email}>{children}</DashboardShell>
  );
}
