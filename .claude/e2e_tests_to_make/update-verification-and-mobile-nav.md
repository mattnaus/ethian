# E2E test specs: update account verification and mobile tab bar

**Derived from review:** `.claude/reviews/review-warnings-c9f36ff.md`
**Date:** 2026-03-09

These three tests cover the new user-visible flows introduced in commit `c9f36ff`. Tests 1–2 should be added to `tests/settings.spec.ts`. Test 3 should be added to `tests/sidebar.spec.ts` (which does not yet exist — create it alongside the tests specified in `smtp-verification-and-sidebar.md`).

---

## Test 1 — Edit account: cosmetic-only change succeeds without connection error

**Scenario name:** `settings: edit account name only does not show connection error`

**Guard:** Skip unless `TEST_IMAP_HOST` is set (same pattern as the add-account tests in `tests/settings.spec.ts`).

**Pre-condition:** An account must already exist. Seed one using the add-account happy-path flow (navigate to `/settings`, open the dialog, fill all fields with valid credentials, submit) or use a `beforeEach` helper if one is available.

**Steps:**

1. Navigate to `/settings`.
2. Locate the account row for the seeded account.
3. Click the edit button (e.g. `page.getByRole("button", { name: /edit/i })`).
4. Wait for the edit dialog to be visible.
5. Clear the `input[name="name"]` field and type `"Renamed Account"`. Do not change any connection fields.
6. Submit the form.
7. Wait up to 5 seconds (a cosmetic edit must not trigger slow verification round-trips).

**Expected outcome:**
- The dialog closes.
- No text matching `"Could not connect"` is visible.
- The account row in the list shows the updated name `"Renamed Account"`.

**What this test guards:** Ensures that once the "unconditional verification" warning is fixed, a name-only edit does not trigger IMAP/SMTP handshakes. Before the fix is applied this test will either time out or produce a spurious error on a slow host.

---

## Test 2 — Edit account: changed IMAP host shows IMAP error

**Scenario name:** `settings: edit account with bad IMAP host shows IMAP error and does not save`

**Guard:** Skip unless `TEST_IMAP_HOST` is set.

**Pre-condition:** Same seeded account as test 1.

**Steps:**

1. Navigate to `/settings`.
2. Click the edit button for the existing account.
3. Wait for the edit dialog to be visible.
4. Change `input[name="imapHost"]` to `"imap.invalid"` (a hostname guaranteed to fail).
5. Submit the form.
6. Wait up to 30 seconds.

**Expected outcome:**
- The dialog remains visible.
- Text matching `"Could not connect to IMAP server"` is visible.
- After closing/dismissing the dialog, the account's IMAP host in the edit form is still the original value (the bad value was not persisted).

**What this test guards:** The `verifyImapConnection` call in `updateMailAccountAction` (accounts.ts:204–208) introduced in this commit. Verifies that an invalid host on update surfaces the correct error and prevents the DB write.

---

## Test 3 — Mobile tab bar: visible and routes correctly at mobile viewport

**Scenario name:** `sidebar: mobile bottom tab bar routes to correct pages at 375px viewport`

**File:** `tests/sidebar.spec.ts` (create alongside the sidebar tests in `smtp-verification-and-sidebar.md`).

**Viewport:** Force mobile width for this describe block:
```ts
test.use({ viewport: { width: 375, height: 812 } });
```

**Setup:** Register and log in before each test using the `register` helper from `tests/helpers/auth`, same pattern as `tests/settings.spec.ts:11–18`.

**Tab items to cover** (derived from `mobileItems` in `src/app/(app)/_components/sidebar.tsx:123–128`):

| Label | href |
|-------|------|
| Inbox | `/imbox` |
| Screener | `/screener` |
| Sent | `/sent` |
| Settings | `/settings` |

**Steps:**

1. Navigate to `/imbox` (any `(app)` layout route).
2. Assert the desktop `aside` element is **not visible**: `await expect(page.locator('aside')).not.toBeVisible()`.
3. Assert the mobile `nav` element is visible: `await expect(page.locator('nav.fixed')).toBeVisible()`. Alternatively locate it by its `border-t` class or a `data-testid` if one is added.
4. For each tab item in the table above:
   a. Find the link within the mobile nav: `page.locator('nav.fixed a[href="' + href + '"]')`.
   b. Assert the link is visible.
   c. Assert the touch target is at least 44px tall: use `boundingBox()` and assert `height >= 44`.
   d. Click the link.
   e. Assert `page.url()` ends with the target path.
   f. Assert the clicked link has the `text-orange-500` class (active state).

**Expected outcome:**
- Desktop sidebar `aside` is not rendered at 375px.
- Mobile `nav` tab bar is visible.
- All four tab links are visible and have a minimum height of 44px.
- Each link navigates to the correct path.
- The active link receives the orange-500 accent colour.

**What this test guards:** The mobile bottom tab bar introduced in this commit. Key risks: the `md:hidden` breakpoint applying correctly, touch target size meeting the 44px minimum required by CLAUDE.md, and safe-area-inset padding not obscuring content.
