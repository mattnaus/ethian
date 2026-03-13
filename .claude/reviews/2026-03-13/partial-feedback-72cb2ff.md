# Review: Partial send feedback and dead type removal — `72cb2ff`

**Date:** 2026-03-13
**Commits reviewed:** `72cb2ff1`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/_actions/reply.ts`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `messages/en.json`

---

## Summary

Clean, small commit that does exactly what was requested: replaces a boolean error state with a richer feedback object carrying severity, adds the partial-success warning string, and removes dead code from the type union. The implementation is correct and the UI properly differentiates error (destructive red) from warning (muted foreground). No security, IMAP/SMTP, or error-handling concerns introduced by this change.

---

## Critical Issues

None.

---

## Warnings

### Feedback not cleared on next successful send
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:249`
**Problem:** If a partial send shows the warning, and the user then sends another reply that succeeds (`result.success === true`), the `feedback` state is only cleared at the start of `handleSend` (line 232). This works correctly because `setFeedback(null)` runs before the await. However, if a future refactor moves the clearing logic, the stale warning could persist. This is not a bug today but the success branch is implicit (no explicit `setFeedback(null)` in the success path). Adding an explicit clear on success would make the intent unambiguous.
**Fix:** Add `setFeedback(null)` (or leave a comment) after the `if/else if` block for the `result.success === true` case. This is defensive, not required.

---

## Suggestions

### DESIGN.md send button spec is stale
**File:** `DESIGN.md:438`
**Note:** The compose bar section documents the send button as `h-8 w-8 p-0` but the actual implementation uses `min-w-11 min-h-11 -my-1.5 p-0` (changed in commit `44cfded`). This predates the current commit but is worth noting since this area was just modified. Update DESIGN.md to reflect the current 44px touch target pattern.

### MessageBubble max-width spec is stale in DESIGN.md
**File:** `DESIGN.md:401`
**Note:** DESIGN.md documents `max-w-[60%]` at `md` breakpoint but the code uses `md:max-w-[72%]` (changed in commit `cacf14b`). Same situation as above -- predates this commit but worth syncing.

---

## README

Does README.md need updating? No. This change is an internal UI refinement with no impact on setup, architecture, or env vars.

---

## E2E tests to add

None. The partial-success path requires a real SMTP send with a simulated DB failure, which is not practical for e2e testing. The existing reply flow coverage (if any) would exercise the success and failure paths. The feedback rendering is a cosmetic detail that does not warrant a dedicated e2e test.
