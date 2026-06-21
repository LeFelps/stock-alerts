import { defineConfig, devices } from "@playwright/test";

const authTestEnv = {
  AUTH_GOOGLE_ID: "test",
  AUTH_GOOGLE_SECRET: "test",
  AUTH_SECRET: "test-secret-at-least-32-characters",
  AUTH_TRUST_HOST: "true",
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/stock_alerts_test",
};

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "pnpm dev",
    env: {
      ...process.env,
      ...authTestEnv,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
