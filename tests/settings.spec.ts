import { test, expect } from "@playwright/test";
import { register } from "./helpers/auth";
import { deleteUser, closeDb } from "./helpers/db";

const USER = {
  email: "test-settings@ethian-test.invalid",
  password: "TestPassword123!",
  name: "Settings Test User",
};

test.beforeEach(async ({ page }) => {
  // Start each test with a clean slate: no user in DB and no session cookie
  await deleteUser(USER.email);
  await page.context().clearCookies();
  // Register and log in before each test
  await register(page, USER);
  await expect(page).toHaveURL("/inbox");
});

test.afterAll(async () => {
  await deleteUser(USER.email);
  await closeDb();
});

// ---------------------------------------------------------------------------
// Settings page basics
// ---------------------------------------------------------------------------

test("settings: shows empty state when no accounts added", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("No accounts yet.")).toBeVisible();
});

test("settings: Add account button opens dialog", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Add mail account" })
  ).toBeVisible();
});

test("settings: closing dialog returns to accounts list", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // Close with Cancel button
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// IMAP-dependent tests (skipped unless TEST_IMAP_HOST is set)
// ---------------------------------------------------------------------------

test("settings: add account with valid IMAP credentials succeeds", async ({
  page,
}) => {
  test.skip(!process.env.TEST_IMAP_HOST, "TEST_IMAP_HOST not set — skipping IMAP tests");
  // Read credentials inside the test (after skip) so empty strings never reach form fills
  const imap = {
    host: process.env.TEST_IMAP_HOST!,
    port: process.env.TEST_IMAP_PORT ?? "993",
    username: process.env.TEST_IMAP_USERNAME!,
    password: process.env.TEST_IMAP_PASSWORD!,
    smtpHost: process.env.TEST_SMTP_HOST ?? process.env.TEST_IMAP_HOST!,
    smtpPort: process.env.TEST_SMTP_PORT ?? "465",
  };

  await page.goto("/settings");
  await page.getByRole("button", { name: "Add account" }).click();

  // Fill in the form
  await page.fill('input[name="name"]', "Test Account");
  await page.fill('input[name="email"]', imap.username);
  await page.fill('input[name="imapHost"]', imap.host);
  await page.fill('input[name="imapPort"]', imap.port);
  await page.fill('input[name="smtpHost"]', imap.smtpHost);
  await page.fill('input[name="smtpPort"]', imap.smtpPort);
  await page.fill('input[name="username"]', imap.username);
  await page.fill('input[name="password"]', imap.password);

  await page.getByRole("button", { name: "Add account" }).click();

  // Dialog should close and account should appear in the list
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Test Account")).toBeVisible();
});

test("settings: add account with wrong IMAP credentials shows error", async ({
  page,
}) => {
  test.skip(!process.env.TEST_IMAP_HOST, "TEST_IMAP_HOST not set — skipping IMAP tests");
  const imap = {
    host: process.env.TEST_IMAP_HOST!,
    port: process.env.TEST_IMAP_PORT ?? "993",
    username: process.env.TEST_IMAP_USERNAME!,
    smtpHost: process.env.TEST_SMTP_HOST ?? process.env.TEST_IMAP_HOST!,
    smtpPort: process.env.TEST_SMTP_PORT ?? "465",
  };

  await page.goto("/settings");
  await page.getByRole("button", { name: "Add account" }).click();

  await page.fill('input[name="name"]', "Bad Account");
  await page.fill('input[name="email"]', imap.username);
  await page.fill('input[name="imapHost"]', imap.host);
  await page.fill('input[name="imapPort"]', imap.port);
  await page.fill('input[name="smtpHost"]', imap.smtpHost);
  await page.fill('input[name="smtpPort"]', imap.smtpPort);
  await page.fill('input[name="username"]', imap.username);
  await page.fill('input[name="password"]', "definitely-wrong-password");

  await page.getByRole("button", { name: "Add account" }).click();

  await expect(
    page.getByText("Could not connect to IMAP server")
  ).toBeVisible({ timeout: 30_000 });
});
