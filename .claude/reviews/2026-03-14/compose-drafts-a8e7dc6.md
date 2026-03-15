# Review: Compose screen & Drafts page — `a8e7dc6`

**Date:** 2026-03-14
**Commits reviewed:** `a8e7dc63`
**Files reviewed:**
- `messages/en.json`
- `src/app/(app)/compose/_actions/compose.ts`
- `src/app/(app)/compose/_components/compose-view.tsx`
- `src/app/(app)/compose/page.tsx`
- `src/app/(app)/drafts/page.tsx`
- `src/app/(app)/_components/sidebar.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`

---

## Summary

Solid implementation overall. The build passes cleanly, i18n coverage is complete, error handling follows the established pattern with try/catch/finally, and auth/ownership checks are present on both server actions. The main concerns are: a bug where `fromAddress` is saved as an empty string in drafts (the work log itself flags this), the compose page suppresses the universal mobile hamburger without actually embedding its own hamburger, and the `sendNewEmailAction` selects all columns from `mailAccounts` when only a subset is needed (not a security leak since it stays server-side, but over-fetching sensitive data in memory). The client component code is well-structured with good keyboard shortcuts, autocomplete, and signature management.

---

## Critical Issues

### Draft `fromAddress` saved as empty string
**File:** `src/app/(app)/compose/_actions/compose.ts:103`
**Problem:** `saveComposeDraftAction` sets `fromAddress: ""` on new drafts. The `mailAccountId` is already known at save time, and the account is fetched and verified at line 65-69. When the draft is later loaded for editing, the `fromAddress` is never displayed, but this means drafts in the DB have invalid `fromAddress` values. If any other code (sync worker, list views, search) filters or groups by `fromAddress`, these drafts will be invisible or incorrectly categorized. Additionally, if the drafts page or any future feature displays the sender, it will show blank.
**Fix:** Replace `fromAddress: ""` with `fromAddress: account.email` (the account is already verified and available in scope at that point). You may also want to add `fromName: account.name ?? null` while you are at it. For the update path (line 79-88), consider updating `fromAddress` too in case the user switches the From account.

---

## Warnings

### Compose page registered in `hasOwnButton` but has no MobileMenuButton
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:113-114`
**Problem:** `/compose` is listed in `hasOwnButton`, which suppresses the universal fixed hamburger on mobile. However, neither `compose/page.tsx` nor `compose-view.tsx` renders a `MobileMenuButton`. On mobile, there is no way to access navigation from the compose screen except via the browser back button -- which is unavailable in PWA standalone mode.
**Fix:** Either embed `MobileMenuButton` in the compose header (next to the close button), or remove `/compose` from `hasOwnButton` so the universal hamburger shows. Given the compose screen has its own close button (X) and a distinct header, embedding the hamburger is the better option.

### No email validation on client-side recipient input
**File:** `src/app/(app)/compose/_components/compose-view.tsx:115-123`
**Problem:** `addRecipient()` accepts any string the user types (trimmed, comma stripped). Invalid email addresses are silently added as chips. The server-side `SaveDraftSchema` and `SendSchema` validate with `z.string().email()`, so saving a draft or sending with an invalid recipient will fail with a generic "invalid_input" error and the user won't know which recipient is bad.
**Fix:** Add a basic email format check in `addRecipient()` before adding to the list. Show a toast or inline error if the address is invalid. Something like: `if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { toast.error(t("invalidEmail")); return; }` (add an `invalidEmail` key to `pages.compose`).

### `sendNewEmailAction` selects all columns from `mailAccounts`
**File:** `src/app/(app)/compose/_actions/compose.ts:145-149`
**Problem:** `db.select()` fetches every column including `encryptedPassword`, `username`, IMAP/SMTP host details, etc. While this data never leaves the server (it stays in the action and is passed to `sendEmail` which needs it), it is better practice to select only the columns needed for sending. If a future refactor accidentally serializes or logs this object, encrypted credentials could leak.
**Fix:** Since `sendEmail()` requires the full `MailAccount` type, this is currently necessary. Consider adding a comment explaining why `select()` is used here, or create a `selectForSending()` helper that returns only the columns `sendEmail` actually reads (host, port, secure, username, encryptedPassword, email, name).

### Draft update does not update `fromAddress` when account changes
**File:** `src/app/(app)/compose/_actions/compose.ts:79-88`
**Problem:** When updating an existing draft, only `toAddresses`, `subject`, `bodyText`, `snippet`, and `updatedAt` are set. If the user switches the From account, the draft's `mailAccountId` filter in the WHERE clause will prevent the update from matching (it checks `eq(emails.mailAccountId, mailAccountId)` against the *new* account ID but the draft was saved with the *old* account ID). The update silently does nothing, and `handleSaveDraft` reports success because the action returns `{ success: true, draftId }` regardless of whether any row was actually updated.
**Fix:** Either: (a) remove `mailAccountId` from the WHERE clause and instead update it in the SET (after verifying ownership of both the draft's original account and the new account), or (b) check `updatedRows` count and return an error if zero rows matched.

### Drafts page has no mobile navigation access
**File:** `src/app/(app)/drafts/page.tsx`
**Problem:** The drafts page does not embed `MobileMenuButton` and is not listed in `hasOwnButton`, so it gets the universal fixed hamburger. This is correct behavior. However, the page header has no back navigation, and in standalone PWA mode on mobile there is no browser back button. The universal hamburger provides nav access, so this is acceptable but worth noting: the hamburger overlaps the top-right corner and there is no visual connection to the header. This is consistent with other placeholder pages, so not a regression.
**Fix:** No immediate fix needed. When the drafts page gets a proper header (like inbox/gatekeeper), embed `MobileMenuButton` in the header and register the path in `hasOwnButton`.

---

## Suggestions

### Add auto-save debounce for drafts
**File:** `src/app/(app)/compose/_components/compose-view.tsx`
**Note:** The current UX requires manually clicking "Save draft". A common pattern for compose screens is to auto-save after a few seconds of inactivity. This would prevent data loss if the user navigates away or the browser crashes. Consider adding a debounced auto-save (e.g. 3 seconds after last keystroke) in a future iteration.

### Recipient chip remove button touch target is small
**File:** `src/app/(app)/compose/_components/compose-view.tsx:290-296`
**Note:** The X button to remove a recipient chip is a 12x12px icon (`h-3 w-3`) with no padding, making it difficult to tap on mobile. The CLAUDE.md spec requires 44x44px minimum touch targets. Add `min-w-6 min-h-6 p-1` or similar to the remove button.

### Autocomplete dropdown not keyboard-navigable
**File:** `src/app/(app)/compose/_components/compose-view.tsx:311-331`
**Note:** The autocomplete suggestion list is only navigable by mouse/touch. Arrow key navigation with Enter to select is the standard UX pattern for autocomplete. Consider adding `highlightedIndex` state with ArrowUp/ArrowDown handling in `handleToKeyDown`.

### `signatures` import in `compose/page.tsx` assumes schema exists
**File:** `src/app/(app)/compose/page.tsx:5`
**Note:** The `signatures` table import works because it was added in a prior commit. No issue here, just confirming the dependency chain is intact.

---

## README

Does README.md need updating? No. The compose and drafts features are internal app pages that don't affect setup, environment variables, or architecture. The README already describes the email flow and the planned compose/reply feature.

---

## E2E tests to add

The following new user-visible flows should have e2e test coverage:

1. **Compose flow** -- navigate to /compose, select From account, add recipients, enter subject/body, send. Verify email appears in sent or is recorded in DB.
2. **Draft save/resume** -- compose a message, save draft, navigate to /drafts, verify draft appears, click to resume editing, verify fields are populated.
3. **Drafts list** -- verify /drafts page shows drafts sorted by recency, verify empty state when no drafts exist.
