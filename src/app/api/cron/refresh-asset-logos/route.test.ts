import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const runRefreshMissingAssetLogosJobMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/watchlist/server/refresh-missing-asset-logos-job", () => ({
  runRefreshMissingAssetLogosJob: runRefreshMissingAssetLogosJobMock,
}));

const originalCronSecret = process.env.CRON_SECRET;

describe("/api/cron/refresh-asset-logos", () => {
  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    runRefreshMissingAssetLogosJobMock.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    process.env.CRON_SECRET = "secret-value";

    const response = await GET(
      new Request("https://example.com/api/cron/refresh-asset-logos"),
    );

    expect(response.status).toBe(401);
    expect(runRefreshMissingAssetLogosJobMock).not.toHaveBeenCalled();
  });

  it("returns the refresh summary for an authorized request", async () => {
    process.env.CRON_SECRET = "secret-value";
    runRefreshMissingAssetLogosJobMock.mockResolvedValue({
      checkedSymbols: 3,
      refreshedSymbols: 1,
      unresolvedSymbols: 2,
      updatedItems: 2,
    });

    const response = await GET(
      new Request("https://example.com/api/cron/refresh-asset-logos", {
        headers: { authorization: "Bearer secret-value" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "SUCCESS",
      summary: {
        checkedSymbols: 3,
        refreshedSymbols: 1,
        unresolvedSymbols: 2,
        updatedItems: 2,
      },
    });
  });
});
