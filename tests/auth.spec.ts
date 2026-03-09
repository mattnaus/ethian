import { test, expect } from "@playwright/test";
import { register, login } from "./helpers/auth";
import { deleteUser, closeDb } from "./helpers/db";

const USER = {
  email: "test-auth@ethian-test.invalid",
  password: "TestPassword123!",
  name: "Test User",
};

test.beforeEach(async () => {
  // Ensure the test user doesn't exist at the start of each test
  await deleteUser(USER.email);
});

test.afterAll(async () => {
  await deleteUser(USER.email);
  await closeDb();
});

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

test("redirects unauthenticated user from /imbox to /login", async ({
  page,
}) => {
  await page.goto("/imbox");
  await expect(page).toHaveURL(/\/login/);
});

test("redirects unauthenticated user from /settings to /login", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

test("register: creates account and redirects to /imbox", async ({ page }) => {
  await register(page, USER);
  await expect(page).toHaveURL("/imbox");
});

test("register: shows error for duplicate email", async ({ page }) => {
  // Create the user first
  await register(page, USER);
  await expect(page).toHaveURL("/imbox");

  // Try to register again — need a fresh context (no auth cookie)
  await page.context().clearCookies();
  await register(page, USER);

  await expect(
    page.getByText("An account with this email already exists.")
  ).toBeVisible();
});

test("register: shows error for short password", async ({ page }) => {
  await register(page, { ...USER, password: "short" });
  await expect(
    page.getByText("Password must be at least 8 characters.")
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test("login: valid credentials redirect to /imbox", async ({ page }) => {
  // Create the user first, then clear cookies and log in manually
  await register(page, USER);
  await page.context().clearCookies();

  await login(page, USER);
  await expect(page).toHaveURL("/imbox");
});

test("login: wrong password shows error", async ({ page }) => {
  await register(page, USER);
  await page.context().clearCookies();

  await login(page, { ...USER, password: "WrongPassword!" });
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("login: unknown email shows error", async ({ page }) => {
  await login(page, { email: "nobody@ethian-test.invalid", password: "any" });
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Authenticated redirects
// ---------------------------------------------------------------------------

test("logged-in user visiting /login is redirected to /imbox", async ({
  page,
}) => {
  await register(page, USER);
  await expect(page).toHaveURL("/imbox"); // wait for registration to complete
  // Already logged in — visiting /login should redirect away
  await page.goto("/login");
  await expect(page).toHaveURL("/imbox");
});
