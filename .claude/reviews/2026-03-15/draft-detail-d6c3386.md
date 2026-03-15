# Review: Standalone Draft Conversation View — `d6c3386`

**Date:** 2026-03-15
**Commits reviewed:** `d6c3386`
**Files reviewed:**
- `src/app/(app)/drafts/[draftId]/page.tsx`
- `src/app/(app)/drafts/[draftId]/_components/draft-detail-view.tsx`
- `src/app/(app)/drafts/[draftId]/_actions/draft.ts`
- `src/app/(app)/drafts/_components/draft-card.tsx`
- `src/app/(app)/compose/_components/compose-view.tsx`
- `messages/en.json`

---

## Summary

Solid implementation overall. The server page has proper auth guards, UUID validation, and ownership checks via JOINs. The client component follows the correct error handling pattern (try/catch/finally with toast). The mobile nav `hasOwnButton` is already registered for `/drafts/` sub-routes. The build passes cleanly with zero errors. Two issues stand out: a hardcoded English string in the draft bubble empty state, and the SMTP send running directly in a Server Action (though this matches the existing compose action pattern).

---

## Critical Issues

None.

---

## Warnings

### Hardcoded string in draft bubble empty state
**File:** `src/app/(app)/drafts/[draftId]/_components/draft-detail-view.tsx:169`
**Problem:** The text `"No message body."` is a hardcoded English string, violating the i18n convention that all user-visible strings must come from `messages/en.json` via `t()`.
**Fix:** Add a key like `"emptyBody": "No message body."` to the `pages.draftDetail` namespace in `messages/en.json` and use `t("emptyBody")` in the component.

### Discard button has small touch target on mobile
**File:** `src/app/(app)/drafts/[draftId]/_components/draft-detail-view.tsx:172-179`
**Problem:** The discard button is a plain `<button>` with no minimum height/width constraints. On mobile, the text "Discard" with a 3.5-size icon will be well below the 44x44px touch target minimum specified in CLAUDE.md.
**Fix:** Add `min-h-11 min-w-11` or wrap with adequate padding to meet the 44px touch target requirement. Alternatively, use `<Button>` from shadcn/ui with appropriate sizing.

### SMTP send runs directly in Server Action
**File:** `src/app/(app)/drafts/[draftId]/_actions/draft.ts:133`
**Problem:** CLAUDE.md states "Never run IMAP operations in a Next.js Server Action directly -- add a job" and "Long-running operations (IMAP sync, email processing) always go through BullMQ." The SMTP send in `sendStandaloneDraftAction` calls `sendEmail()` directly, which involves network I/O with timeouts up to 30 seconds. However, the existing compose action (`compose/_actions/compose.ts`) follows the same pattern, so this is a pre-existing deviation rather than a new one.
**Fix:** For consistency with the existing codebase, this can stay as-is for now. When the send flow is eventually refactored to use BullMQ, both this action and the compose send action should be updated together.

---

## Suggestions

### Consider revalidating `/sent` path after successful send
**File:** `src/app/(app)/drafts/[draftId]/_actions/draft.ts:189`
**Problem:** After sending and inserting a row with `category: "sent"`, only `/drafts` is revalidated. If the user navigates to `/sent`, they won't see the newly sent email until the next server-side revalidation.
**Note:** Add `revalidatePath("/sent")` alongside the existing `revalidatePath("/drafts")` call on successful send.

### `toAddresses` type cast in page.tsx is loose
**File:** `src/app/(app)/drafts/[draftId]/page.tsx:55`
**Problem:** The line `toAddresses: Array.isArray(row.toAddresses) ? row.toAddresses : []` drops the typed `Array<{address, name?}>` from the Drizzle `$type` annotation down to `unknown[]` at runtime. While the Drizzle type system keeps it correct at compile time, the runtime check (`Array.isArray`) does not validate the shape of individual elements. If corrupt data exists in the DB, it would pass through silently.
**Note:** This is low risk since the data is written by the app itself, but a Zod parse at this boundary would add defense in depth.

---

## README

Does README.md need updating? No. This is a new internal page/route with no new env vars, dependencies, or setup changes.

---

## E2E tests to add

The draft detail view introduces several new user-visible flows that should have e2e coverage:

1. **Navigate to draft detail** -- click a draft from the list, verify the draft detail page loads with correct subject, recipients, and body.
2. **Edit draft** -- click Edit on the draft detail view, verify redirect to compose with draft data prepopulated.
3. **Discard draft** -- click Discard, verify the draft is deleted and user is redirected to `/drafts`.
4. **Save draft redirects to detail** -- compose a new draft, save it, verify redirect to `/drafts/[id]` instead of staying on compose.
