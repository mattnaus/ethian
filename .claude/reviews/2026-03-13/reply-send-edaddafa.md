# Review: Email reply send flow — `edaddafa`

**Date:** 2026-03-13
**Commits reviewed:** `edaddafa`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/_actions/reply.ts`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `messages/en.json`

---

## Summary

Solid implementation overall. The Server Action has proper auth guards and ownership checks via the `mailAccounts.userId` join. The optimistic UI pattern with rollback is well-structured. The SMTP client already handles transport lifecycle correctly (per-send transporter with timeouts). There are two significant issues: missing input validation on the Server Action payload, and the DB insert after a failed SMTP send not being wrapped in error handling, which could leave the action in an inconsistent state.

---

## Critical Issues

### No input validation on Server Action payload
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:14-18`
**Problem:** The `sendReplyAction` accepts `payload.bodyText`, `payload.mailAccountId`, and `payload.emailId` as raw strings with zero validation. Server Actions are publicly callable HTTP endpoints — any client can invoke them with arbitrary data. An empty `bodyText`, a non-UUID `emailId`, or a missing `mailAccountId` would either produce a malformed email or cause a database error with a stack trace. More importantly, `bodyText` flows directly into `sendEmail()` and `db.insert()` without length limits, allowing arbitrarily large payloads.
**Fix:** Add validation at the top of the action. At minimum: verify `mailAccountId` and `emailId` are non-empty strings (ideally UUID-shaped via regex), verify `bodyText` is a non-empty string, and enforce a reasonable max length (e.g. 100KB). Use a schema validation library (zod is already common in Next.js Server Actions) or manual checks.

---

## Warnings

### DB insert not wrapped in try/catch after successful SMTP send
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:69-93`
**Problem:** If the SMTP send succeeds (line 55-61) but the subsequent `db.insert()` (line 69) throws (e.g. unique constraint violation, DB connection issue), the action throws an unhandled error. The email was already sent via SMTP but the user sees a failure, and the sent message is not recorded in the database. The optimistic message is rolled back on the client, making it appear as if nothing happened, even though the recipient received the email.
**Fix:** Wrap the DB insert in a try/catch. On insert failure, still return `{ success: true }` (the email was sent) but log the error. Alternatively, return a distinct status like `{ success: true, dbSyncFailed: true }` so the UI can show a softer warning ("Sent, but may not appear in your thread until next sync").

### `optimisticMessages` state drifts from server truth
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:176`
**Problem:** `optimisticMessages` is initialized from `threadMessages` but never re-synced when the server prop changes (e.g. after `revalidatePath` triggers a re-render with fresh data from the server). If the parent re-renders with updated `threadMessages` (containing the real DB row for the sent email), the component still shows the stale optimistic state because `useState` only uses the initial value. This means the optimistic placeholder message persists indefinitely instead of being replaced by the real server data.
**Fix:** Add an effect that updates `optimisticMessages` when `threadMessages` changes, e.g.:
```tsx
useEffect(() => {
  setOptimisticMessages(threadMessages);
}, [threadMessages]);
```
This replaces optimistic entries with real server data after revalidation.

### Error message from server action exposed directly to user
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:46,64`
**Problem:** The error strings "Email not found" (line 46) and "Failed to send. Please try again." (line 64) are hardcoded English strings returned from the Server Action, bypassing the i18n system. The `sendFailed` key exists in `en.json` but is never used — the action returns its own string instead. If locales are added later, these errors will remain in English.
**Fix:** Return error codes (e.g. `error: "EMAIL_NOT_FOUND"`, `error: "SMTP_FAILED"`) from the Server Action, and map them to translated strings in the component using `t()`.

---

## Suggestions

### `imapUid: 0` placeholder could conflict with real UID 0
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:89`
**Note:** IMAP UIDs are positive integers (RFC 3501 section 2.3.1.1: "Strstrlen must be a 32-bit value ... The value of unique identifiers ... is strictly positive"). Using `0` as a sentinel is safe in that no real IMAP UID will be `0`, but it would be cleaner to make `imapUid` nullable in the schema for locally-originated emails. This avoids any ambiguity and makes queries like "find emails not yet synced to IMAP" trivial (`WHERE imap_uid IS NULL`).

### `navigator.platform` is deprecated
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:180`
**Note:** `navigator.platform` is deprecated. The modern replacement is `navigator.userAgentData?.platform` (with fallback to `navigator.platform` for browsers that don't support it yet). Not urgent since this is only used for a cosmetic hint string.

### Send button size differs from DESIGN.md spec
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:362`
**Note:** DESIGN.md specifies the send button as `h-8 w-8` (line 438), but the implementation uses `min-w-11 min-h-11` (44px touch target). The 44px touch target is correct per the mobile touch target convention, but this creates a visual discrepancy with the design spec. Reconcile DESIGN.md to match the implementation, or use the `h-8 w-8` visual size with `min-h-11 min-w-11` as a hit area wrapper.

---

## README

Does README.md need updating? No. This change adds reply functionality to an existing view. No new env vars, setup steps, or architectural changes.

---

## E2E tests to add

A new user-visible flow (sending a reply) was introduced. The following test should be added:

1. **Reply send flow** — navigate to an email detail view, type a reply, submit via button click and via Cmd/Ctrl+Enter, verify the optimistic message appears, verify error state on failure (mock SMTP failure).

