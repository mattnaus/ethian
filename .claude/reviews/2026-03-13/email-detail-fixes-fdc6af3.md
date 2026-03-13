# Review: Email detail view review fixes — `fdc6af3`

**Date:** 2026-03-13
**Commits reviewed:** `fdc6af3d`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/page.tsx`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `DESIGN.md`

---

## Summary

This commit addresses all findings from the previous review of the email detail view (96c0936). The fixes are well-scoped and correct: UUID validation prevents DB errors on malformed params, the `Array.isArray` guard handles JSONB edge cases, semantic tokens replace hardcoded zinc classes, touch targets meet the 44px minimum, and the mobile tab bar overlap is resolved. The DESIGN.md updates stay in sync with the code. Two minor issues remain — a hardcoded English string and a missing authorization scope on the mark-as-read update — but neither is a blocker.

---

## Critical Issues

None.

---

## Warnings

### Mark-as-read UPDATE is not scoped to the owning user
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:72-78`
**Problem:** The read query (lines 27-50) correctly joins on `mailAccounts.userId` to scope access. But the fire-and-forget `UPDATE` on line 72-75 only filters by `emails.id`. This is not exploitable today because the `notFound()` on line 52 prevents reaching line 72 for emails the user does not own. However, if this code is ever refactored (e.g. the update is extracted into a shared helper), the missing scope becomes a real authorization bug. Defense-in-depth says the write should carry the same authorization constraint as the read.
**Fix:** Add a subquery or join condition that verifies `mailAccounts.userId = userId` on the update, or extract a helper that takes both `emailId` and `userId`. At minimum, add a comment explaining why the scope is safe as-is.

### Hardcoded English string "No message body."
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:66`
**Problem:** The fallback text `"No message body."` is hardcoded in English. All other UI strings in this component use `useTranslations("pages.emailDetail")` and `messages/en.json`. This violates the i18n convention in CLAUDE.md.
**Fix:** Add a `"noBody"` key to `messages/en.json` under `pages.emailDetail` and replace the hardcoded string with `t("noBody")`.

---

## Suggestions

### Back button overflows the h-12 top bar
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:96`
**Note:** The back button is `h-11` (44px) inside a `h-12` (48px) top bar. That leaves only 2px of vertical breathing room above and below, making the button visually cramped. The touch target requirement is satisfied, but the button almost fills the bar height. Consider using `min-h-11 min-w-11` with a smaller visible area (e.g. keep the icon area at `h-9 w-9` but expand the tappable region with padding) to maintain the 44px tap target without crowding the bar.

### Textarea is editable but the form does nothing
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:165-173`
**Note:** The send button is correctly disabled, but the textarea is still editable. A user can type a reply and then discover they cannot send it. Consider also making the textarea `readOnly` or adding a visual hint (e.g. a small "Coming soon" label) to set expectations before the user invests effort composing text.

---

## README

Does README.md need updating? No. This commit is a bug-fix pass on an existing feature with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The email detail view was introduced in 96c0936 and these are refinement fixes. E2E test needs (if any) should be tracked against the original feature commit.
