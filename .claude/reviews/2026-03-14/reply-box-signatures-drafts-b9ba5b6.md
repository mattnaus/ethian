# Review: Reply box with signatures & draft support — `b9ba5b6`

**Date:** 2026-03-14
**Commits reviewed:** `b9ba5b60`
**Files reviewed:**
- `src/db/schema/signatures.ts`
- `src/db/schema/index.ts`
- `drizzle/0003_unique_wolf_cub.sql`
- `messages/en.json`
- `src/app/(app)/settings/_actions/signatures.ts`
- `src/app/(app)/settings/_components/signature-form.tsx`
- `src/app/(app)/settings/_components/signatures-list.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/inbox/[emailId]/_actions/draft.ts`
- `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/inbox/[emailId]/page.tsx`

---

## Summary

Large feature commit that adds signature CRUD, draft save/update/delete/send lifecycle, and a redesigned reply box with drag-to-resize and signature picker. The build passes cleanly. Database schema, server actions, and UI are well-structured overall. The main concerns are: (1) `deleteSignatureAction` throws to the client instead of returning a result object, (2) several hardcoded English error strings bypass i18n, (3) the `handleDelete` in `SignaturesList` lacks the required try/catch/finally error handling pattern, and (4) the `sendDraftAction` selects the full `mailAccounts` row (including `encryptedPassword`) which is fine for server-side use but worth noting for future API boundary safety. The drag-to-resize and signature strip are cleanly implemented with good UX affordances.

---

## Critical Issues

None.

---

## Warnings

### 1. `deleteSignatureAction` throws to the client instead of returning a result object
**File:** `src/app/(app)/settings/_actions/signatures.ts:33-36, 106`
**Problem:** `requireSession()` throws `new Error("Not authenticated")` and `verifyOwnership()` throws `new Error("Signature not found")`. For `createSignatureAction` and `updateSignatureAction` the callers have try/catch, but `deleteSignatureAction` returns `Promise<void>` — it has no typed result object at all. The convention (CLAUDE.md) requires Server Actions to never throw to the client and always return `{ success: true } | { success: false, error: string }`.
**Fix:** Change `deleteSignatureAction` to return `Promise<{ success: true } | { success: false; error: string }>`. Wrap the body in try/catch, catch auth and ownership errors, and return `{ success: false, error: "..." }` instead of letting exceptions propagate. Also change `requireSession()` to return `null` instead of throwing, or wrap all calls to it in try/catch within each action.

### 2. `handleDelete` in `SignaturesList` does not follow the error handling pattern
**File:** `src/app/(app)/settings/_components/signatures-list.tsx:33-39`
**Problem:** `handleDelete` calls `deleteSignatureAction` without try/catch/finally. If the action throws (which it will on auth failure or ownership check), the error is unhandled. There is no `toast.error()` call on failure. The `deletingId` state is cleared only on success path (line 38), so if the action throws, the button stays in its disabled state forever.
**Fix:** Wrap in try/catch/finally per the reference pattern: toast.error on failure, `setDeletingId(null)` in `finally`.

### 3. Hardcoded English strings instead of i18n keys
**File:** `src/app/(app)/settings/_components/signature-form.tsx:55-56, 58`
**Problem:** `toast.error(result.error ?? "Something went wrong.")` and `toast.error("Something went wrong.")` use hardcoded English. The convention requires all user-visible strings to come from `messages/en.json` via `t()`.
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:118, 121`
**Problem:** `toast.error("Failed to save draft.")` is hardcoded English, used twice.
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:354`
**Problem:** `toast.error("Failed to discard draft.")` is hardcoded English.
**Fix:** Add keys like `draftSaveFailed`, `draftDiscardFailed`, `actionFailed` to `messages/en.json` under the appropriate namespace and use `t("key")` in all these locations.

### 4. `handleSend` in ReplyBox swallows errors silently — no toast on failure
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:89-101`
**Problem:** `handleSend` has a try block with only a `finally` clause — no `catch`. If `onSend` throws (which it does on SMTP error, line 334 of email-detail-view.tsx), the error propagates up uncaught. The thrown error from `handleSend` in `EmailDetailView` (line 334: `throw new Error("smtp_error")`) is caught by... nothing in the `ReplyBox` caller chain. The `void handleSend()` call on line 273 discards the promise rejection.
**Fix:** Add a `catch` block in `handleSend` that calls `toast.error(t("sendFailed"))`. Also reconsider whether `handleSend` in `EmailDetailView` should throw — returning a rejected state rather than throwing would be cleaner.

### 5. `handleDiscardDraft` and `handleSendDraft` lack try/catch
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:349-356, 358-389`
**Problem:** Neither `handleDiscardDraft` nor `handleSendDraft` has a try/catch. If the server action throws (network error, unexpected exception), the error is unhandled. The `DraftBubble` component does wrap the calls in `.finally()` for pending state, but there is no catch anywhere in the chain for unexpected exceptions.
**Fix:** Add try/catch in both functions with `toast.error(t("..."))` in the catch block.

### 6. `confirm()` is not available in all PWA contexts
**File:** `src/app/(app)/settings/_components/signatures-list.tsx:34`
**Problem:** `confirm()` is a browser-native modal that may not render properly or may be blocked in standalone PWA mode on iOS. It also cannot be translated via i18n.
**Fix:** Replace with a shadcn/ui `AlertDialog` component that uses translated strings.

---

## Suggestions

### 1. `account: mailAccounts` selects the full row including encrypted password
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:214`
**Note:** `account: mailAccounts` in the select causes the full `mail_accounts` row to be fetched, including `encrypted_password`. This is fine for a server action (the data never leaves the server), and `sendEmail` needs the full `MailAccount` to decrypt credentials. However, for defense-in-depth, consider selecting only the columns `sendEmail` actually needs, or at minimum add a comment explaining why the full row is intentional.

### 2. Signature picker and dismiss buttons have small tap targets
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:191, 244`
**Note:** The `ChevronDown` and `X` buttons in the signature strip are `h-6 w-6` (24x24px), well below the 44x44px minimum for mobile touch targets specified in CLAUDE.md. The `min-w-9 min-h-9` pattern is used for the toolbar buttons but not here.

### 3. `sendDraftAction` has a `success: "partial"` variant
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:48`
**Note:** The `success: "partial"` type is unusual. `success` is conventionally boolean. Consider using `{ success: true, warning: "..." }` or a separate `status` field to avoid confusion when checking `result.success === true` vs truthy checks.

### 4. Missing `isDraft` on the single-email fallback thread entry
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:169-185`
**Note:** The `finalThreadMessages` fallback for null-threadId emails does not include `isDraft`. While unlikely (a draft wouldn't be the entry email), it creates a type inconsistency — the `ThreadMessage` type has `isDraft?` optional, but this fallback omits it entirely while the threadRows path always includes it.

### 5. `Paperclip` import unused in `reply-box.tsx` effectively
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:4`
**Note:** `Paperclip` is imported and rendered (line 260) but the attach button is non-functional (no onClick handler). This is acceptable as a placeholder, but should be noted.

---

## README

Does README.md need updating? **No.** The signatures feature is an internal UI addition that does not change setup, environment variables, or architecture. The new `signatures` table is handled by migrations. No new env vars are introduced.

---

## E2E tests to add

1. **Signature CRUD** — add/edit/delete a signature in Settings; verify default badge toggles correctly.
2. **Reply box with signature** — verify the signature strip appears when a default signature exists, can be dismissed, and is appended to sent replies.
3. **Draft lifecycle** — save a draft, verify DraftBubble appears, edit the draft, discard the draft.
