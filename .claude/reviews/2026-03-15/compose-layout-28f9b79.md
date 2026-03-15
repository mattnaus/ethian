# Review: Compose layout alignment — `28f9b79`

**Date:** 2026-03-15
**Commits reviewed:** `28f9b79`, `1607be8`, `e8d110d`
**Files reviewed:** `src/app/(app)/compose/_components/compose-view.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`

---

## Summary

The compose view layout was restructured to match the inbox/gatekeeper pattern — separate desktop and mobile top bars, centered mailbox selector, card container with heading inside. The inbox view was cleaned up by removing a duplicate inline New button on mobile and restoring a proper FAB. The code is well-organized, follows the error handling reference pattern, uses i18n correctly, and the build passes cleanly. A few minor issues around React component definition patterns, accessibility, and safe-area handling.

---

## Critical Issues

None.

---

## Warnings

### AccountPickerContent defined as function inside render scope
**File:** `src/app/(app)/compose/_components/compose-view.tsx:209`
**Problem:** `AccountPickerContent` is defined as a named function component inside `ComposeView`. This means React creates a new component type on every render, which destroys and remounts the entire subtree each time the parent re-renders (losing focus, animation state, etc.). It also captures `fromAccountId` and `setFromAccountId` via closure, making it look like a component but behave like a render function.
**Fix:** Either extract `AccountPickerContent` as a standalone component outside `ComposeView` (passing `fromAccountId`, `setFromAccountId`, and `mailAccounts` as props), or rename it to a plain render function (e.g., `renderAccountPickerContent`) and call it with `{renderAccountPickerContent({ onClose })}` instead of `<AccountPickerContent onClose={...} />` to make the intent clear. Extracting as a proper component is preferred.

### Mobile FAB missing aria-label
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:466-472`
**Problem:** The mobile floating action button for composing a new email has no `aria-label`. Screen readers will announce it as an unlabeled button since it contains only an icon.
**Fix:** Add `aria-label={t("newButton")}` to the `<Button>` element.

### Mobile FAB does not account for safe-area-inset-bottom
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:465`
**Problem:** The FAB is positioned with `bottom-6` (24px). On iOS devices in standalone PWA mode, the home indicator overlaps the bottom of the screen. The compose view toolbar correctly uses `env(safe-area-inset-bottom)` (line 493), but the inbox FAB does not. On devices with a home indicator, the FAB may be partially obscured or uncomfortable to tap.
**Fix:** Change `bottom-6` to a value that incorporates the safe area, e.g., use an inline style: `style={{ bottom: "max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))" }}`.

---

## Suggestions

### Desktop close button touch target is smaller than mobile
**File:** `src/app/(app)/compose/_components/compose-view.tsx:280-286`
**Note:** The desktop close button uses `min-w-9 min-h-9` (36px) while the mobile close button correctly uses `min-w-11 min-h-11` (44px). This is acceptable for desktop but worth noting for consistency — if users access the desktop layout on a tablet in landscape, the smaller target may be harder to tap.

### Recipient remove button has a small tap target on mobile
**File:** `src/app/(app)/compose/_components/compose-view.tsx:346-352`
**Note:** The X button to remove a recipient chip is a small inline button with no minimum size. On mobile, this will be difficult to tap accurately. Consider wrapping it with padding or adding `min-w-6 min-h-6 flex items-center justify-center` to make the hit area larger.

---

## README

Does README.md need updating? No. These changes are purely UI layout adjustments with no impact on setup, architecture, environment variables, or user-facing documentation.

---

## E2E tests to add

None. The compose page layout changes are visual and do not introduce new user flows, redirects, or error states beyond what already exists. The FAB in inbox simply navigates to `/compose`, which is already a covered route.
