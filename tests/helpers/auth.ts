import type { Page } from "@playwright/test";

interface Credentials {
  email: string;
  password: string;
  name?: string;
}

/**
 * Fill in and submit the register form.
 * Waits for navigation to complete (success → /inbox, error → stays on page).
 */
export async function register(page: Page, creds: Credentials) {
  await page.goto("/register");
  if (creds.name) {
    await page.fill('input[name="name"]', creds.name);
  }
  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  // Disable browser-native constraint validation so the server action handles
  // it. We set noValidate on the form rather than mutating individual inputs,
  // which is a single DOM write and unaffected by React reconciliation.
  await page.evaluate(() => {
    const form = document.querySelector("form") as HTMLFormElement | null;
    if (form) form.noValidate = true;
  });
  await page.click('button[type="submit"]');
}

/**
 * Fill in and submit the login form.
 * Waits for navigation to complete (success → /inbox, error → stays on page).
 */
export async function login(page: Page, creds: Credentials) {
  await page.goto("/login");
  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await page.evaluate(() => {
    const form = document.querySelector("form") as HTMLFormElement | null;
    if (form) form.noValidate = true;
  });
  await page.click('button[type="submit"]');
}
