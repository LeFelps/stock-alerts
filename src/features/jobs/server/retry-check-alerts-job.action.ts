"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperProfile } from "@/features/profiles/server/current-profile";

import { listRecentJobRuns } from "../application/manage-job-runs";
import { eligibleMarketDateForAlertCheck } from "../domain/eligible-market-date";
import { createDrizzleJobRunRepository } from "../infrastructure/drizzle-job-run-repository";
import {
  AlertCheckJobAlreadyRunningError,
  runCheckAlertsJob,
} from "./check-alerts-job";

export type RetryCheckAlertsJobResult =
  | { jobRunId: string; status: "success" }
  | {
      error:
        | "already_running"
        | "job_failed"
        | "not_retryable"
        | "validation_error";
      status: "error";
    };

const retryCheckAlertsJobSchema = z.object({
  intent: z.literal("retry"),
});

export async function retryCheckAlertsJob(
  formData: FormData,
): Promise<RetryCheckAlertsJobResult> {
  await requireSuperProfile();

  const parsedFields = retryCheckAlertsJobSchema.safeParse({
    intent: formData.get("intent"),
  });

  if (!parsedFields.success) {
    return { error: "validation_error", status: "error" };
  }

  const jobRunRepository = createDrizzleJobRunRepository();
  const [latestJobRun] = await listRecentJobRuns(
    { limit: 1 },
    { jobRunRepository },
  );

  if (latestJobRun?.status !== "FAILED") {
    return { error: "not_retryable", status: "error" };
  }

  try {
    const eligibleMarketDate =
      latestJobRun.eligibleMarketDate ??
      eligibleMarketDateForAlertCheck(latestJobRun.startedAt);
    const result = await runCheckAlertsJob({ eligibleMarketDate });
    revalidateAlertCheckPaths();

    if (!result.ok) {
      return { error: "job_failed", status: "error" };
    }

    return { jobRunId: result.jobRun.id, status: "success" };
  } catch (error) {
    if (error instanceof AlertCheckJobAlreadyRunningError) {
      return { error: "already_running", status: "error" };
    }

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
