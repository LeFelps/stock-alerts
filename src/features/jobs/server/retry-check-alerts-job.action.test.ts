import { beforeEach, describe, expect, it, vi } from "vitest";

import { retryCheckAlertsJob } from "./retry-check-alerts-job.action";

const createDrizzleJobRunRepositoryMock = vi.hoisted(() => vi.fn());
const listRecentJobRunsMock = vi.hoisted(() => vi.fn());
const requireSuperProfileMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const runCheckAlertsJobMock = vi.hoisted(() => vi.fn());
const AlertCheckJobAlreadyRunningErrorMock = vi.hoisted(
  () => class AlertCheckJobAlreadyRunningError extends Error {},
);

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@/features/profiles/server/current-profile", () => ({
  requireSuperProfile: requireSuperProfileMock,
}));

vi.mock("../application/manage-job-runs", () => ({
  listRecentJobRuns: listRecentJobRunsMock,
}));

vi.mock("../infrastructure/drizzle-job-run-repository", () => ({
  createDrizzleJobRunRepository: createDrizzleJobRunRepositoryMock,
}));

vi.mock("./check-alerts-job", () => ({
  AlertCheckJobAlreadyRunningError: AlertCheckJobAlreadyRunningErrorMock,
  runCheckAlertsJob: runCheckAlertsJobMock,
}));

describe("retryCheckAlertsJob", () => {
  beforeEach(() => {
    createDrizzleJobRunRepositoryMock.mockReset();
    createDrizzleJobRunRepositoryMock.mockReturnValue({
      type: "job-run-repository",
    });
    listRecentJobRunsMock.mockReset();
    listRecentJobRunsMock.mockResolvedValue([
      {
        eligibleMarketDate: "2026-07-17",
        startedAt: new Date("2026-07-18T11:00:00.000Z"),
        status: "FAILED",
      },
    ]);
    requireSuperProfileMock.mockReset();
    requireSuperProfileMock.mockResolvedValue({
      email: "super@example.com",
      profile: { id: "profile-1", role: "SUPER" },
    });
    revalidatePathMock.mockReset();
    runCheckAlertsJobMock.mockReset();
    runCheckAlertsJobMock.mockResolvedValue({
      jobRun: { id: "job-run-2", status: "SUCCESS" },
      ok: true,
    });
  });

  it("repeats the latest failed job and refreshes the jobs page", async () => {
    await expect(retryCheckAlertsJob(retryFormData())).resolves.toEqual({
      jobRunId: "job-run-2",
      status: "success",
    });

    expect(requireSuperProfileMock).toHaveBeenCalledOnce();
    expect(listRecentJobRunsMock).toHaveBeenCalledWith(
      { limit: 1 },
      { jobRunRepository: { type: "job-run-repository" } },
    );
    expect(runCheckAlertsJobMock).toHaveBeenCalledWith({
      eligibleMarketDate: "2026-07-17",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/jobs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/signals");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/tickers/[symbol]",
      "page",
    );
  });

  it("derives the eligible date for failed job runs created before it was stored", async () => {
    listRecentJobRunsMock.mockResolvedValue([
      {
        eligibleMarketDate: null,
        startedAt: new Date("2026-07-18T11:00:00.000Z"),
        status: "FAILED",
      },
    ]);

    await retryCheckAlertsJob(retryFormData());

    expect(runCheckAlertsJobMock).toHaveBeenCalledWith({
      eligibleMarketDate: "2026-07-17",
    });
  });

  it("rejects malformed requests before reading job history", async () => {
    await expect(retryCheckAlertsJob(new FormData())).resolves.toEqual({
      error: "validation_error",
      status: "error",
    });

    expect(requireSuperProfileMock).toHaveBeenCalledOnce();
    expect(listRecentJobRunsMock).not.toHaveBeenCalled();
    expect(runCheckAlertsJobMock).not.toHaveBeenCalled();
  });

  it("does not retry when the unfiltered latest job did not fail", async () => {
    listRecentJobRunsMock.mockResolvedValue([{ status: "SUCCESS" }]);

    await expect(retryCheckAlertsJob(retryFormData())).resolves.toEqual({
      error: "not_retryable",
      status: "error",
    });

    expect(runCheckAlertsJobMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns an expected error and refreshes history when the retry fails", async () => {
    runCheckAlertsJobMock.mockResolvedValue({
      error: "provider unavailable",
      jobRun: { id: "job-run-2", status: "FAILED" },
      ok: false,
    });

    await expect(retryCheckAlertsJob(retryFormData())).resolves.toEqual({
      error: "job_failed",
      status: "error",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/jobs");
  });

  it("rejects a retry while another alert check is running", async () => {
    runCheckAlertsJobMock.mockRejectedValue(
      new AlertCheckJobAlreadyRunningErrorMock(),
    );

    await expect(retryCheckAlertsJob(retryFormData())).resolves.toEqual({
      error: "already_running",
      status: "error",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

function retryFormData() {
  const formData = new FormData();
  formData.set("intent", "retry");
  return formData;
}
