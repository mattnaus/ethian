import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so we can read DATABASE_URL_TEST
config({ path: ".env.local" });

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;

if (!DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST is not set in .env.local. " +
      "Create an ethian_test database and add: " +
      "DATABASE_URL_TEST=postgresql://<user>@localhost:5432/ethian_test"
  );
}

export default defineConfig({
  testDir: "./tests",

  // Run tests serially to avoid DB conflicts between tests
  fullyParallel: false,
  workers: 1,

  // No retries — flaky tests should be fixed, not retried
  retries: 0,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3001",
    // Retain traces for any failing test (on-first-retry is useless with retries: 0)
    trace: "retain-on-failure",
  },

  expect: {
    // Allow extra time for Next.js dev server round-trips
    timeout: 10_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start Next.js on port 3001 so it doesn't conflict with the dev server on 3000
  webServer: {
    command: "PORT=3001 npm run dev",
    url: "http://localhost:3001",
    // Never reuse — tests must always get a server pointed at the test DB
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Override DATABASE_URL so the test server uses the test DB
      DATABASE_URL: DATABASE_URL_TEST,
      // Override NEXTAUTH_URL so auth redirects stay on the test server port
      NEXTAUTH_URL: "http://localhost:3001",
    },
  },

  globalSetup: "./tests/global-setup.ts",
});
