import { afterEach, describe, expect, it, vi } from "vitest";

import { toJobRunId } from "@/features/jobs/domain/job-run";

import { GET } from "./route";

const runCheckAlertsJobMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/jobs/server/check-alerts-job", () => ({
  runCheckAlertsJob: runCheckAlertsJobMock,
}));

const originalCronSecret = process.env.CRON_SECRET;

describe("/api/cron/check-alerts", () => {
  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    runCheckAlertsJobMock.mockReset();
  });

  it("runs without an Authorization header when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    runCheckAlertsJobMock.mockResolvedValue({
      jobRun: createJobRun("SUCCESS"),
      ok: true,
    });

    const response = await GET(
      new Request("https://example.com/api/cron/check-alerts"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jobRunId: "job-run-1",
      status: "SUCCESS",
      summary: expect.any(Object),
    });
    expect(runCheckAlertsJobMock).toHaveBeenCalledTimes(1);
  });

  it("rejects requests without the expected bearer token when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "secret-value";

    const response = await GET(
      new Request("https://example.com/api/cron/check-alerts", {
        headers: { authorization: "Bearer wrong-value" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(runCheckAlertsJobMock).not.toHaveBeenCalled();
  });

  it("runs when the expected bearer token is present", async () => {
    process.env.CRON_SECRET = "secret-value";
    runCheckAlertsJobMock.mockResolvedValue({
      jobRun: createJobRun("SUCCESS"),
      ok: true,
    });

    const response = await GET(
      new Request("https://example.com/api/cron/check-alerts", {
        headers: { authorization: "Bearer secret-value" },
      }),
    );

    expect(response.status).toBe(200);
    expect(runCheckAlertsJobMock).toHaveBeenCalledTimes(1);
  });

  it("returns a failed response when the job records a failure", async () => {
    delete process.env.CRON_SECRET;
    runCheckAlertsJobMock.mockResolvedValue({
      error: "Provider unavailable",
      jobRun: createJobRun("FAILED"),
      ok: false,
    });

    const response = await GET(
      new Request("https://example.com/api/cron/check-alerts"),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Provider unavailable",
      jobRunId: "job-run-1",
      status: "FAILED",
      summary: expect.any(Object),
    });
  });
});

function createJobRun(status: "FAILED" | "SUCCESS") {
  return {
    createdAt: new Date("2026-01-02T12:00:00.000Z"),
    durationMs: 1000,
    error: status === "FAILED" ? "Provider unavailable" : null,
    finishedAt: new Date("2026-01-02T12:00:01.000Z"),
    id: toJobRunId("job-run-1"),
    jobName: "CHECK_ALERTS",
    startedAt: new Date("2026-01-02T12:00:00.000Z"),
    status,
    summary: {
      createdSignals: 0,
      enabledTargets: 0,
      failedEmails: 0,
      refreshedSymbols: 0,
      sentEmails: 0,
      skippedEmails: 0,
      uniqueSymbols: 0,
    },
    updatedAt: new Date("2026-01-02T12:00:01.000Z"),
  };
}
