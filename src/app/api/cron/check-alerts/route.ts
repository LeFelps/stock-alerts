import { runCheckAlertsJob } from "@/features/jobs/server/check-alerts-job";
import { isAuthorizedCronRequest } from "@/features/jobs/server/is-authorized-cron-request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCheckAlertsJob();

  return Response.json(
    {
      jobRunId: result.jobRun.id,
      status: result.jobRun.status,
      summary: result.jobRun.summary,
      ...(result.ok ? {} : { error: result.error }),
    },
    { status: result.ok ? 200 : 500 },
  );
}
