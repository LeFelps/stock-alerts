import { isAuthorizedCronRequest } from "@/features/jobs/server/is-authorized-cron-request";
import { runRefreshMissingAssetLogosJob } from "@/features/watchlist/server/refresh-missing-asset-logos-job";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runRefreshMissingAssetLogosJob();

  return Response.json({ status: "SUCCESS", summary });
}
