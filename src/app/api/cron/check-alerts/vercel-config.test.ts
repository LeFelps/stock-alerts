import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Vercel alert-check schedule", () => {
  it("runs the protected cron route Tuesday through Saturday at 11:00 UTC", async () => {
    const config = JSON.parse(
      await readFile(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };

    expect(config.crons).toContainEqual({
      path: "/api/cron/check-alerts",
      schedule: "0 11 * * 2-6",
    });
  });

  it("refreshes missing asset logos every day before the market-data job", async () => {
    const config = JSON.parse(
      await readFile(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };

    expect(config.crons).toContainEqual({
      path: "/api/cron/refresh-asset-logos",
      schedule: "30 10 * * *",
    });
  });
});
