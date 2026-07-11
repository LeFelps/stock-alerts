import { runCheckAlertsJob } from "@/features/jobs/server/check-alerts-job";

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

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}
