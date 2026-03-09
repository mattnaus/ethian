# Review: SMTP verification on account add; sidebar TS fix — `0fe5a34`

**Date:** 2026-03-09
**Commits reviewed:** `0fe5a34`, `294754a`
**Files reviewed:**
- `src/app/(app)/settings/_actions/accounts.ts`
- `src/app/(app)/_components/sidebar.tsx`
- `src/lib/smtp/client.ts`
- `src/lib/imap/client.ts`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/saved/page.tsx` (representative of all five placeholder pages)

---

## Summary

The SMTP verification addition is sound: building a single `candidate` object and reusing it for both IMAP and SMTP checks is clean, the `as const` narrowing on `syncStatus` is correctly applied, and errors surface to the user before any DB write. The TypeScript fix in sidebar is correct and preferable to `as const` for a mutable array with an optional property. The sidebar redesign (`294754a`) follows the design system colour palette and uses shadcn/ui Tooltip correctly. However, there are two meaningful gaps: `updateMailAccountAction` still skips connection re-verification when credentials change, and the sidebar has no mobile layout at all — CLAUDE.md explicitly requires the sidebar to collapse to a bottom tab bar on small screens, and the current 56px rail is completely unusable on mobile. Both are tracked below.

---

## Critical Issues

None.

---

## Warnings

### `updateMailAccountAction` skips connection verification
**File:** `src/app/(app)/settings/_actions/accounts.ts:182`
**Problem:** When a user edits an account and changes the IMAP host, SMTP host, or password, `updateMailAccountAction` writes the new values directly to the database with no connection check. An invalid credential update will silently break sync until the next worker run surfaces an error. The `addMailAccountAction` now correctly verifies both connections before saving; the update path should do the same.
**Fix:** Before the `db.update(...)` call, build a candidate object from the parsed fields (using `encryptedPassword` as derived), call `verifyImapConnection` and `verifySmtpConnection`, and return an error if either fails. The candidate needs a real `id` here — use `existing.id`. When `password` is absent (user left the field blank), re-use `existing.encryptedPassword`.

### Sidebar has no mobile layout
**File:** `src/app/(app)/_components/sidebar.tsx:78`
**Problem:** CLAUDE.md specifies that on screens narrower than `md` (768px) the sidebar must collapse to a bottom tab bar with safe-area insets. The current `aside` is `w-14 h-screen` with no responsive variants. On a mobile viewport the rail is present but the icon touch targets (calculated from `px-3 py-2` on an `h-5 w-5` icon inside a link) are approximately 44×36px — just below the 44×44px minimum specified in CLAUDE.md. The sidebar also covers screen width without the full-bleed main content required on mobile.
**Fix:** Add a responsive bottom tab bar rendered only at `< md` breakpoint (e.g. `fixed bottom-0 inset-x-0 flex md:hidden pb-[env(safe-area-inset-bottom)] bg-zinc-950 border-t border-zinc-800`). Hide the `aside` rail on mobile with `hidden md:flex`. Ensure each tab target is at minimum `min-h-11 min-w-11`.

### `console.error` leaks internal error strings in server-side logs
**File:** `src/app/(app)/settings/_actions/accounts.ts:121,127`
**Problem:** `imapResult.error` and `smtpResult.error` come directly from the IMAP/SMTP server response strings (e.g. imapflow throws with the server greeting text, nodemailer with the SMTP reply). These strings can contain the username, domain, or other account-identifying information. Logging them to the server console is low-risk in a self-hosted context but still violates the principle of not logging credentials or account identifiers.
**Fix:** Log a sanitised version — e.g. log only the account's `email` field and a generic failure indicator rather than the raw server error string. The raw error can be returned as the structured `error` field on the result object for debugging, or omitted entirely from the log.

---

## Suggestions

### Sidebar: `active` matching is too broad for short paths
**File:** `src/app/(app)/_components/sidebar.tsx:47`
**Note:** `pathname.startsWith(href + "/")` is fine for most routes, but `/sent` will never have sub-routes at present, making the second condition dead weight. More importantly, if a future route were `/settings/sent`, the `/sent` item would not incorrectly activate (since the check is `href + "/"`, not just `href`), so this is not a bug — but it's worth noting if deeper nesting is ever added.

### Placeholder pages have no `<title>` or accessible heading
**File:** `src/app/(app)/saved/page.tsx` (and snoozed, sent, trash, screener)
**Note:** The placeholder pages export a bare `<main>` with inline text. When these become real pages, each should export a `metadata` object (`export const metadata = { title: "Saved — Ethian" }`) and render an `<h1>`. Not urgent for placeholders, but easy to forget once the real page content is added.

### CLAUDE.md documents the sidebar as 220px wide with icon + text
**File:** `CLAUDE.md:84`
**Note:** The architecture doc still says "Fixed width ~220px, Nav items: Icon (Lucide) + text label, always visible". The sidebar is now 56px icon-only. CLAUDE.md should be updated to reflect the new design.

### `verifySmtpConnection` creates a transporter and immediately calls `verify()` — same as `sendEmail`
**File:** `src/lib/smtp/client.ts:178`
**Note:** `verifySmtpConnection` opens a TCP connection and authenticates. The transporter is not reused. This is fine for a one-shot verification call on account add, but if this function is ever called in a hot path (e.g. before every send) it will double the connection overhead since `sendEmail` already calls `transporter.verify()` internally. No change needed now, just be aware if the call site changes.

---

## README

No. README.md does not need updating for these commits. The SMTP verification is an internal behaviour change with no user-visible setup impact. However, **CLAUDE.md does need updating** (see Suggestion above regarding the sidebar width and nav description at line 84). That is a documentation accuracy issue, not a setup-guide issue.

---

## E2E tests to add

The following new user-visible flows were introduced or completed by these commits and lack e2e coverage:

1. **Add account — SMTP failure rejection:** Submit the add-account form with valid IMAP credentials but invalid SMTP credentials. Expect an error message containing "SMTP" and no account saved.
2. **Add account — both checks pass:** Submit with valid IMAP and SMTP credentials. Expect the account to appear in the settings list.
3. **Sidebar nav — icon-only rail:** Verify each nav item routes correctly and shows the tooltip text on hover (desktop viewport).
4. **Placeholder pages load:** Navigate to `/saved`, `/snoozed`, `/sent`, `/trash`, `/screener` and assert each returns a 200 and renders without crashing.

A spec file has been created below.
