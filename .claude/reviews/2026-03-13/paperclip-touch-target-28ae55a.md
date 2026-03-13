# Review: Paperclip touch target fix — `28ae55a`

**Date:** 2026-03-13
**Commits reviewed:** `28ae55a8`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

Single-line change that restores the 44x44px touch target on the paperclip (attach file) button in the compose bar. The approach — `min-w-11 min-h-11` for the tap area plus `-my-1.5` negative margin to prevent inflating the compose bar height — is clean and correct. The fix is consistent with how the back button and "more options" button handle touch targets elsewhere in the same file.

---

## Critical Issues

None.

---

## Warnings

### Send button does not meet 44px touch target
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:312`
**Problem:** The send button uses `h-8 w-8` (32x32px), which is below the 44x44px minimum for mobile touch targets per CLAUDE.md guidelines. This is a pre-existing issue, not introduced by this commit, but worth noting since the paperclip button was just fixed for the same reason.
**Fix:** Apply the same pattern: `min-w-11 min-h-11 -my-1.5` with `flex items-center justify-center`, keeping the visual circle at 32px via inner element or icon sizing.

---

## Suggestions

None.

---

## README

Does README.md need updating? No. This is a CSS-only fix to an existing component.

---

## E2E tests to add

None.
