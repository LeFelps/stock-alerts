import { describe, expect, it, vi } from "vitest";

import { withPostgresAlertCheckJobLock } from "./postgres-alert-check-job-lock";

vi.mock("@/db", () => ({ postgresClient: {} }));

describe("withPostgresAlertCheckJobLock", () => {
  it("runs the operation while holding the advisory lock", async () => {
    const release = vi.fn();
    const connection = createConnection({ acquired: true }, release);
    const client = { reserve: vi.fn().mockResolvedValue(connection) };
    const operation = vi.fn().mockResolvedValue("completed");

    await expect(
      withPostgresAlertCheckJobLock(operation, client),
    ).resolves.toEqual({ acquired: true, value: "completed" });

    expect(operation).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects overlapping work without running the operation", async () => {
    const release = vi.fn();
    const connection = createConnection({ acquired: false }, release);
    const client = { reserve: vi.fn().mockResolvedValue(connection) };
    const operation = vi.fn();

    await expect(
      withPostgresAlertCheckJobLock(operation, client),
    ).resolves.toEqual({ acquired: false });

    expect(operation).not.toHaveBeenCalled();
    expect(connection).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it("unlocks and releases the connection when the operation fails", async () => {
    const release = vi.fn();
    const connection = createConnection({ acquired: true }, release);
    const client = { reserve: vi.fn().mockResolvedValue(connection) };

    await expect(
      withPostgresAlertCheckJobLock(
        vi.fn().mockRejectedValue(new Error("provider failed")),
        client,
      ),
    ).rejects.toThrow("provider failed");

    expect(connection).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledOnce();
  });
});

function createConnection(lock: { acquired: boolean }, release: () => void) {
  const connection = vi
    .fn()
    .mockResolvedValueOnce([lock])
    .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);

  return Object.assign(connection, { release });
}
