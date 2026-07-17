import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AlertCheckJobAlreadyRunningError,
  runCheckAlertsJob,
} from "./check-alerts-job";

const withPostgresAlertCheckJobLockMock = vi.hoisted(() => vi.fn());

vi.mock("@/db", () => ({ db: {}, postgresClient: {} }));

vi.mock("../infrastructure/postgres-alert-check-job-lock", () => ({
  withPostgresAlertCheckJobLock: withPostgresAlertCheckJobLockMock,
}));

describe("runCheckAlertsJob", () => {
  beforeEach(() => {
    withPostgresAlertCheckJobLockMock.mockReset();
  });

  it("rejects a run when another alert check holds the lock", async () => {
    withPostgresAlertCheckJobLockMock.mockResolvedValue({ acquired: false });

    await expect(runCheckAlertsJob()).rejects.toBeInstanceOf(
      AlertCheckJobAlreadyRunningError,
    );
  });
});
