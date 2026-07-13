import type { ReactNode } from "react";

import { requireSuperProfile } from "@/features/profiles/server/current-profile";

export default async function JobsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSuperProfile();

  return children;
}
