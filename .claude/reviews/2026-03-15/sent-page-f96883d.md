# Review: Sent Page — `f96883d`

**Date:** 2026-03-15
**Commits reviewed:** `f96883d`
**Files reviewed:**
- `src/app/(app)/sent/page.tsx`
- `src/app/(app)/sent/_components/sent-card.tsx`
- `src/app/(app)/sent/_components/sent-view.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `messages/en.json`

---

## Summary

Clean implementation that closely follows the established Drafts/Inbox patterns. Build passes with zero errors. The i18n keys are all present and properly namespaced. The `hasOwnButton` registration is correct. No security concerns (read-only page, no mutations). Two minor issues: a potential runtime crash if `sentAt` is somehow null at the edge (low risk given the schema constraint), and the `getGroupLabel`/`groupEmails`/`GroupDivider`/`MailboxFilterContent` functions are now duplicated across four views.

---

## Critical Issues

None.

---

## Warnings

### Mobile FAB may be obscured by iOS home indicator
**File:** `src/app/(app)/sent/_components/sent-view.tsx:361`
**Problem:** The mobile compose FAB uses `fixed bottom-6 right-4` which does not account for `safe-area-inset-bottom` on iOS standalone mode. On devices with a home indicator, the button could overlap or sit too close to the gesture area. This is a pre-existing pattern shared with Inbox and Drafts views, but it should be flagged.
**Fix:** Use `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]` or a wrapper with `pb-safe` to push the FAB above the safe area. Apply consistently across all three views.

---

## Suggestions

### Extract shared list utilities into a common module
**File:** `src/app/(app)/sent/_components/sent-view.tsx:32-73`
**Note:** `getGroupLabel`, `groupEmails`, `GroupDivider`, and `MailboxFilterContent` are now copy-pasted across four views (inbox, drafts, gatekeeper, sent). Extract them into a shared module (e.g. `src/app/(app)/_components/list-helpers.tsx`) to reduce drift risk and maintenance burden.

### `toLocaleString` in `getGroupLabel` ignores the `locale` prop
**File:** `src/app/(app)/sent/_components/sent-view.tsx:42`
**Note:** The fallback branch calls `date.toLocaleString("default", ...)` instead of using the `locale` prop that is already threaded through the component tree. This means older date groups will use the browser default locale rather than the app locale. Pass `locale` into `getGroupLabel` and use it in the `toLocaleString` call. Same issue exists in the other views.

---

## README

Does README.md need updating? No. This is a new list view following existing patterns, with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The Sent page is a read-only list view with no mutations or form submissions. Existing auth flow tests cover access control. A future e2e test for the full compose-send-view-in-sent flow would be valuable but is better scoped to a compose/send feature test rather than this specific commit.
