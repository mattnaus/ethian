# Review: Reply send second review fixes — `f7fb87d`

**Date:** 2026-03-13
**Commits reviewed:** `f7fb87d`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/_actions/reply.ts`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

Small, well-scoped commit that addresses the three findings from the prior review. The `"partial"` success state is a sound design choice: it prevents the UI from rolling back a message that was already delivered via SMTP, which would confuse the user. The `inserted` undefined guard, `.trim()` on the Zod schema, and the strict `=== false` check in the component are all correct. No security, lifecycle, or correctness issues found in this diff.

---

## Critical Issues

None.

---

## Warnings

### No user-visible feedback on partial failure
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:248`
**Problem:** When `result.success === "partial"`, the user gets no indication that the DB insert failed. The optimistic message stays (correct), but the user has no way to know the email won't appear in their sent history after a page reload. On next sync the message may or may not be picked up from the IMAP Sent folder depending on provider behavior.
**Fix:** Show a non-blocking warning (e.g. a brief toast or inline note) like "Message sent but could not be saved locally. It will appear on next sync." This avoids confusion if the user navigates away and the message is missing from their thread view.

---

## Suggestions

### `SendReplyError` includes `"db_error"` but it is no longer returned
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:32`
**Note:** The `"db_error"` variant in `SendReplyError` is now dead code since both DB failure paths return `{ success: "partial" }` instead. Remove it to keep the type honest and avoid misleading consumers.

---

## README

Does README.md need updating? No. This is an internal error-handling refinement with no impact on setup, architecture, or user-facing behaviour.

---

## E2E tests to add

None. The partial failure path is an edge case that requires simulating a DB failure after a successful SMTP send, which is not practical in e2e tests. The existing reply send happy-path coverage (if any) is sufficient.
