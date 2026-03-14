# Review: Fix review warnings (reply box / signatures) — `338d14f`

**Date:** 2026-03-14
**Commits reviewed:** `338d14f`
**Files reviewed:**
- `messages/en.json`
- `src/components/ui/alert-dialog.tsx`
- `src/app/(app)/settings/_actions/signatures.ts`
- `src/app/(app)/settings/_components/signatures-list.tsx`
- `src/app/(app)/settings/_components/signature-form.tsx`
- `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/inbox/[emailId]/page.tsx`

---

## Summary

This commit addresses six warnings and two suggestions from the b9ba5b6 review. The changes are well-scoped and correctly applied: `deleteSignatureAction` now returns a typed result instead of throwing, `confirm()` is replaced with an AlertDialog, hardcoded English strings are moved to i18n, and missing try/catch/finally blocks are added. The build passes cleanly. A few residual issues remain: one uncaught exception path in `handleSend` that can leave orphaned optimistic messages, some remaining hardcoded English strings that were not part of the original review scope but are now more visible, and undersized touch targets on signature list buttons.

---

## Critical Issues

None.

---

## Warnings

### Uncaught exception in `handleSend` leaves orphaned optimistic message
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:309-337`
**Problem:** `handleSend` adds an optimistic message to state (line 322) then calls `await sendReplyAction(...)` (line 325) without a try/catch. If `sendReplyAction` throws (network error, serialization failure), the exception propagates to `ReplyBox.handleSend`'s catch block, which shows a toast but has no way to remove the optimistic message from `EmailDetailView`'s state. The user sees a phantom "sent" message that was never actually sent.
**Fix:** Wrap lines 325-336 in a try/catch. In the catch block, remove the optimistic message (`setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id))`) and re-throw or call `setFeedback` with an error message. Example:
```ts
try {
  const result = await sendReplyAction({ ... });
  if (result.success === false) {
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    setFeedback({ text: t("sendFailed"), isError: true });
  } else if (result.success === "partial") {
    setFeedback({ text: t("sendPartialWarning"), isError: false });
  }
} catch {
  setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
  setFeedback({ text: t("sendFailed"), isError: true });
}
```

### Signature edit/delete buttons below 44px touch target
**File:** `src/app/(app)/settings/_components/signatures-list.tsx:114,124`
**Problem:** The edit and delete icon buttons use `h-8 w-8` (32x32px). CLAUDE.md requires interactive elements to be at least 44x44px on mobile (`min-h-11 min-w-11`). The same commit correctly bumped the signature picker/dismiss buttons in `reply-box.tsx` to `min-w-9 min-h-9` (36px), but these signature list buttons were not updated. Both are below the 44px threshold.
**Fix:** Change `h-8 w-8` to `min-h-11 min-w-11 h-11 w-11` on both buttons, or at minimum use `min-w-9 min-h-9` for consistency with the reply-box approach.

### Hardcoded English strings in `signatures.ts` server action
**File:** `src/app/(app)/settings/_actions/signatures.ts:57,84`
**Problem:** `createSignatureAction` and `updateSignatureAction` return `{ error: "Invalid input." }` -- a hardcoded English string. While server actions return error codes (not user-visible strings) in some patterns, these `error` values are displayed to users via `toast.error` in `signature-form.tsx` line 55. However, the form currently ignores `result.error` and uses `t("actionFailed")` instead, so the hardcoded string is dead code right now. It will become a bug if any future code uses `result.error` directly.
**Fix:** Either change the return to `{ error: "invalid_input" }` (a code, not a message) or remove the `error` field entirely since the client already uses its own i18n key.

---

## Suggestions

### Hardcoded "No message body." string
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:179`
**Note:** The string `"No message body."` is hardcoded in the JSX. This predates this commit but is a violation of the i18n convention. Should be moved to `messages/en.json` and referenced via `t()`.

### `isDraft` is optional on `ThreadMessage` type but always provided
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:47`
**Note:** `isDraft` is typed as `isDraft?: boolean` (optional). The page component now explicitly sets `isDraft: false` for the single-email fallback (line 182) and the thread query includes `isDraft` from the DB (line 81 of page.tsx). Consider making the field required (`isDraft: boolean`) to eliminate the need for `?.` checks and make the contract explicit.

---

## README

Does README.md need updating? No. This commit fixes internal code quality issues (error handling, i18n, component swap) with no impact on setup, architecture, or user-facing behaviour documentation.

---

## E2E tests to add

None. The changes are defensive error handling improvements and a dialog swap. The existing settings e2e tests cover signature CRUD. No new user-visible flows were introduced.
