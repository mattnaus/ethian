# E2E test specs: SMTP verification and sidebar

**Derived from review:** `.claude/reviews/smtp-verification-0fe5a34.md`
**Date:** 2026-03-09

These four tests cover the new user-visible flows introduced in commits `0fe5a34` and `294754a`. Add them to `tests/settings.spec.ts` (tests 1–2) and a new `tests/sidebar.spec.ts` (tests 3–4).

---

## Test 1 — Add account: SMTP failure rejection

**Scenario name:** `settings: add account with valid IMAP but invalid SMTP credentials shows SMTP error`

**Guard:** Skip unless `TEST_IMAP_HOST` is set (same pattern used in the existing IMAP tests in `tests/settings.spec.ts:59`).

**Environment variables consumed:**
- `TEST_IMAP_HOST`, `TEST_IMAP_PORT` (default `993`), `TEST_IMAP_USERNAME`, `TEST_IMAP_PASSWORD` — valid credentials for a real IMAP server
- `TEST_SMTP_HOST`, `TEST_SMTP_PORT` (default `465`) — a host that is reachable but will reject authentication (use a bogus value such as `smtp.invalid` or an intentionally wrong port on the real host)

**Steps:**

1. Navigate to `/settings`.
2. Click the button with accessible name `"Add account"`.
3. Wait for the dialog with role `dialog` and heading `"Add mail account"` to be visible.
4. Fill form fields:
   - `input[name="name"]` → `"SMTP Fail Account"`
   - `input[name="email"]` → value of `TEST_IMAP_USERNAME`
   - `input[name="imapHost"]` → value of `TEST_IMAP_HOST`
   - `input[name="imapPort"]` → value of `TEST_IMAP_PORT` (default `"993"`)
   - `input[name="smtpHost"]` → a host that will reject the connection (e.g. `"smtp.invalid"` or an intentionally wrong hostname)
   - `input[name="smtpPort"]` → `"465"`
   - `input[name="username"]` → value of `TEST_IMAP_USERNAME`
   - `input[name="password"]` → value of `TEST_IMAP_PASSWORD` (correct IMAP password; SMTP rejection must come from the host, not the password)
5. Click the button with accessible name `"Add account"` (the submit button inside the dialog).
6. Wait up to 30 seconds (SMTP handshake can be slow on timeout).

**Expected outcome:**
- The dialog remains visible (no account was saved).
- A text node matching `"Could not connect to SMTP server"` is visible on the page. This is the exact string returned by `addMailAccountAction` at `src/app/(app)/settings/_actions/accounts.ts:128`.
- The text `"SMTP Fail Account"` does not appear in the accounts list after closing/dismissing the dialog.

**What this test guards:** The SMTP verification step in `addMailAccountAction` (`accounts.ts:125–129`) introduced in `0fe5a34`. Before this commit there was no SMTP check; a bad SMTP host would be saved silently.

---

## Test 2 — Add account: both IMAP and SMTP checks pass

**Scenario name:** `settings: add account with valid IMAP and SMTP credentials succeeds`

**Note:** This flow is already substantially covered by the existing test `"settings: add account with valid IMAP credentials succeeds"` in `tests/settings.spec.ts:56–88`. That test fills both `smtpHost` and `smtpPort` and expects the account to appear in the list — which now implicitly exercises the new SMTP verification path. **Do not duplicate that test.** Instead, add an explicit assertion that verifies SMTP was actually checked: after the account appears, confirm the dialog closed without any error text visible. If the existing test is modified in future to use a stubbed SMTP host, extract the SMTP fields into their own env vars (`TEST_SMTP_HOST`, `TEST_SMTP_PORT`) rather than defaulting them from `TEST_IMAP_HOST`.

**Environment variables consumed:** Same as the existing IMAP test — `TEST_IMAP_HOST`, `TEST_IMAP_PORT`, `TEST_IMAP_USERNAME`, `TEST_IMAP_PASSWORD`, and optionally `TEST_SMTP_HOST` / `TEST_SMTP_PORT`.

**Steps (supplement to the existing test, not a new test body):**

1. Follow steps 1–5 of the existing `"add account with valid IMAP credentials succeeds"` test verbatim, filling `smtpHost` from `TEST_SMTP_HOST ?? TEST_IMAP_HOST` and `smtpPort` from `TEST_SMTP_PORT ?? "465"`.
2. After the dialog closes, assert no error text matching `"Could not connect"` is visible.
3. Assert the account name `"Test Account"` is visible in the accounts list.

**Expected outcome:**
- Dialog closes within 30 seconds.
- No error text is visible.
- The account row with name `"Test Account"` is present in the list.

**What this test guards:** End-to-end happy path through both `verifyImapConnection` and `verifySmtpConnection` before the `db.insert` call.

---

## Test 3 — Sidebar nav: icon-only rail routing and tooltip verification (desktop viewport)

**Scenario name:** `sidebar: each nav item routes to the correct path and displays a tooltip on hover`

**File:** Create in a new `tests/sidebar.spec.ts`.

**Viewport:** Force desktop width to ensure the sidebar is rendered. Use Playwright's `use: { viewport: { width: 1280, height: 800 } }` either in `playwright.config.ts` (if not already set) or via `test.use({ viewport: { width: 1280, height: 800 } })` at the top of the describe block.

**Setup:** Register and log in before each test using the `register` helper from `tests/helpers/auth`, matching the pattern in `tests/settings.spec.ts:11–18`.

**Nav items to cover** (derived from `NAV_ITEMS` in `src/app/(app)/_components/sidebar.tsx:28–35` and the Settings item at line 96–113):

| Label | href | Expected tooltip text |
|---|---|---|
| Inbox | `/inbox` | `"Inbox"` |
| Saved | `/saved` | `"Saved"` |
| Snoozed | `/snoozed` | `"Snoozed"` |
| Sent | `/sent` | `"Sent"` |
| Trash | `/trash` | `"Trash"` |
| Screener | `/screener` | `"Screener"` |
| Settings | `/settings` | `"Settings"` |

**Steps (run for each nav item in the table above):**

1. Navigate to `/inbox` (or any app page — the sidebar is present on all `(app)` layout routes).
2. Locate the sidebar `aside` element.
3. Within the sidebar, find the link whose `href` attribute equals the target path (e.g. `page.locator('aside a[href="/saved"]')`).
4. Hover over the link.
5. Wait for the shadcn/ui `TooltipContent` to appear. The tooltip is rendered in a portal — query it via `page.getByRole("tooltip")` or `page.locator('[role="tooltip"]')`.
6. Assert the tooltip text equals the expected label string.
7. Click the link.
8. Assert `page.url()` ends with the target path (use `toHaveURL(new RegExp(href + '$'))` or `toHaveURL(href)`).
9. Assert the link now has the active style class `text-orange-500` (check via `page.locator('aside a[href="' + href + '"]').evaluate(el => el.className)`), or assert its computed color. Alternatively, assert `aria-current="page"` if that attribute is set by the component — check the rendered output first; the current sidebar does not set `aria-current`, so class inspection is the reliable approach.

**Expected outcome per item:**
- Tooltip with the correct label appears on hover.
- Navigation occurs and the URL changes to the target path.
- The active link receives the `text-orange-500` class (orange-500 accent colour per design system).
- The previously active link no longer has the active class.

**What this test guards:** The sidebar redesign in `294754a` — icon-only rail with shadcn/ui Tooltip wrappers around every link. The `delayDuration={0}` on `TooltipProvider` (sidebar.tsx:77) means the tooltip should appear immediately on hover without extra waiting.

---

## Test 4 — Placeholder pages load without crashing

**Scenario name:** `placeholder pages: /saved, /snoozed, /sent, /trash, /screener each render without error`

**File:** Add to `tests/sidebar.spec.ts` alongside test 3, or add to `tests/settings.spec.ts` as a standalone block. Either location is acceptable; `sidebar.spec.ts` is preferred because these pages are reached via the sidebar.

**Setup:** Same register/login setup as test 3 — authenticate once in `beforeEach`.

**Pages to test** (all five placeholder routes under `src/app/(app)/`):

| Path | Expected body text |
|---|---|
| `/saved` | `"Saved — coming soon"` |
| `/snoozed` | `"Snoozed — coming soon"` |
| `/sent` | `"Sent — coming soon"` |
| `/trash` | `"Trash — coming soon"` |
| `/screener` | `"Screener — coming soon"` |

**Steps (run for each path in the table above):**

1. Call `await page.goto(path)`.
2. Assert the response status is `200`. Use `page.goto` return value: `const response = await page.goto(path); expect(response?.status()).toBe(200);`
3. Assert the page does not show a Next.js error boundary. Check that no element matching `text=/Application error|something went wrong/i` is visible.
4. Assert the expected body text is visible: `await expect(page.getByText(expectedText)).toBeVisible()`.

**Expected outcome per page:**
- HTTP 200 response.
- No error boundary rendered.
- Placeholder text `"[Page name] — coming soon"` visible in the `<main>` element.

**What this test guards:** The five placeholder pages (`saved`, `snoozed`, `sent`, `trash`, `screener`) introduced alongside the sidebar redesign. Because they are bare `export default function` components with no data fetching, the main risk is a layout import error or missing `(app)` layout wrapper causing a crash — this test catches that at the rendering level.
