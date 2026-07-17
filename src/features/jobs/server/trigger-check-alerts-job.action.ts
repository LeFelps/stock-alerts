"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperProfile } from "@/features/profiles/server/current-profile";

import { runCheckAlertsJob } from "./check-alerts-job";

export type TriggerCheckAlertsJobResult =
  | { jobRunId: string; status: "success" }
  | { error: "job_failed" | "validation_error"; status: "error" };

const triggerCheckAlertsJobSchema = z.object({
  intent: z.literal("trigger"),
});

export async function triggerCheckAlertsJob(
  formData: FormData,
): Promise<TriggerCheckAlertsJobResult> {
  await requireSuperProfile();

  const parsedFields = triggerCheckAlertsJobSchema.safeParse({
    intent: formData.get("intent"),
  });

  if (!parsedFields.success) {
    return { error: "validation_error", status: "error" };
  }

  try {
    const result = await runCheckAlertsJob();
    revalidateAlertCheckPaths();

    if (!result.ok) {
      return { error: "job_failed", status: "error" };
    }

    return { jobRunId: result.jobRun.id, status: "success" };
  } catch {
    revalidateAlertCheckPaths();
    return { error: "job_failed", status: "error" };
  }
}

function revalidateAlertCheckPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/signals");
  revalidatePath("/dashboard/tickers/[symbol]", "page");
}
