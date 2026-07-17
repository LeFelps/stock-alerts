import { beforeEach, describe, expect, it, vi } from "vitest";

import { triggerCheckAlertsJob } from "./trigger-check-alerts-job.action";

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

vi.mock("./check-alerts-job", () => ({
  AlertCheckJobAlreadyRunningError: AlertCheckJobAlreadyRunningErrorMock,
  runCheckAlertsJob: runCheckAlertsJobMock,
}));

describe("triggerCheckAlertsJob", () => {
  beforeEach(() => {
    requireSuperProfileMock.mockReset();
    requireSuperProfileMock.mockResolvedValue({
      email: "super@example.com",
      profile: { id: "profile-1", role: "SUPER" },
    });
    revalidatePathMock.mockReset();
    runCheckAlertsJobMock.mockReset();
    runCheckAlertsJobMock.mockResolvedValue({
      jobRun: { id: "job-run-1", status: "SUCCESS" },
      ok: true,
    });
  });

  it("starts a fresh alert check and refreshes derived pages", async () => {
    await expect(triggerCheckAlertsJob(triggerFormData())).resolves.toEqual({
      jobRunId: "job-run-1",
      status: "success",
    });

    expect(requireSuperProfileMock).toHaveBeenCalledOnce();
    expect(runCheckAlertsJobMock).toHaveBeenCalledWith();
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/jobs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/signals");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/dashboard/tickers/[symbol]",
      "page",
    );
  });

  it("rejects malformed requests before starting the job", async () => {
    await expect(triggerCheckAlertsJob(new FormData())).resolves.toEqual({
      error: "validation_error",
      status: "error",
    });

    expect(requireSuperProfileMock).toHaveBeenCalledOnce();
    expect(runCheckAlertsJobMock).not.toHaveBeenCalled();
  });

  it("returns an expected error and refreshes history when the job fails", async () => {
    runCheckAlertsJobMock.mockResolvedValue({
      error: "provider unavailable",
      jobRun: { id: "job-run-1", status: "FAILED" },
      ok: false,
    });

    await expect(triggerCheckAlertsJob(triggerFormData())).resolves.toEqual({
      error: "job_failed",
      status: "error",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/jobs");
  });

  it("rejects an overlapping run without refreshing unchanged pages", async () => {
    runCheckAlertsJobMock.mockRejectedValue(
      new AlertCheckJobAlreadyRunningErrorMock(),
    );

    await expect(triggerCheckAlertsJob(triggerFormData())).resolves.toEqual({
      error: "already_running",
      status: "error",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

function triggerFormData() {
  const formData = new FormData();
  formData.set("intent", "trigger");
  return formData;
}
