# Review: Compose UI redesign — `5498c0a`

**Date:** 2026-03-14
**Commits reviewed:** `5498c0a`
**Files reviewed:**
- `messages/en.json`
- `src/app/(app)/compose/_components/compose-view.tsx`
- `src/app/(app)/inbox/_components/inbox-view.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`

---

## Summary

The compose layout restructure is clean and well-organized: the card container, mailbox selector extraction, and account name + email display are all solid improvements. The i18n key was added correctly. Error handling in both `handleSend` and `handleSaveDraft` follows the reference pattern. Two issues stand out: mobile nav is inaccessible from the compose page due to a missing `MobileMenuButton`, and the mobile inbox FAB is broken (no click handler).

---

## Critical Issues

### Mobile inbox FAB has no click handler
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:473`
**Problem:** The floating action button at lines 472-476 renders a `<Button>` with a `PenLine` icon but has no `onClick` handler. Tapping it does nothing. The new inline button added in the mobile top bar (line 398) works correctly, making the FAB redundant and confusing -- users see a prominent orange button that is non-functional.
**Fix:** Either add `onClick={() => router.push("/compose")}` to the FAB, or remove it entirely since the top-bar button now serves the same purpose. Removing it is the cleaner option since having two compose buttons on mobile is redundant.

---

## Warnings

### No mobile nav access on compose page
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:113`
**Problem:** The compose page is registered in `hasOwnButton` (lines 113-114: `pathname === "/compose" || pathname.startsWith("/compose/")`), which suppresses the universal fixed hamburger button. However, `compose-view.tsx` does not import or render `MobileMenuButton` anywhere. On mobile, there is no way to open the navigation drawer from the compose screen. The user can only go back via the X button, but cannot navigate to other sections.
**Fix:** Either add `MobileMenuButton` to the compose header (e.g. next to the title), or remove `/compose` from the `hasOwnButton` check so the universal fixed hamburger appears. Given the compose page has its own close button and is a transient screen, removing it from `hasOwnButton` and letting the universal button appear is the simpler fix.

### Close button touch target is 36x36px, below 44x44px minimum
**File:** `src/app/(app)/compose/_components/compose-view.tsx:219`
**Problem:** The close button uses `min-w-9 min-h-9` (36x36px). CLAUDE.md requires 44x44px minimum touch targets on mobile (`min-h-11 min-w-11`).
**Fix:** Change to `min-w-11 min-h-11`.

### Recipient remove button has no minimum touch target
**File:** `src/app/(app)/compose/_components/compose-view.tsx:299-305`
**Problem:** The X button to remove a recipient chip has no minimum size constraint. The icon is `h-3 w-3` (12x12px) and the button has no padding or minimum dimensions, making it nearly impossible to tap accurately on mobile.
**Fix:** Add `min-w-6 min-h-6 flex items-center justify-center` or similar to give it a reasonable tap area. Since it is inside a chip, 24px is a pragmatic minimum.

---

## Suggestions

### Mailbox selector truncation at 200px may clip on mobile
**File:** `src/app/(app)/compose/_components/compose-view.tsx:240`
**Problem:** `max-w-[200px]` on the account name + email span is a fixed pixel width. With the new `name — email` format, this will truncate early on small screens. On very narrow screens the mailbox label + button + chevron could still fit, but most of the useful information will be hidden.
**Note:** Consider using `max-w-[60vw]` or a responsive variant like `max-w-[200px] md:max-w-[300px]` to show more on wider screens.

### Mobile New button label is sr-only — consider a visible label
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:403`
**Note:** The new mobile compose button uses `<span className="sr-only">` for its label, making it icon-only. This is fine since the PenLine icon is recognizable, but it is worth noting that the desktop version shows "New" text. Consistent labeling across breakpoints would improve discoverability for new users.

---

## README

Does README.md need updating? No. This is a UI-only layout change with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The compose flow and inbox navigation are existing features with layout-only changes. The broken FAB is a bug to fix, not a new flow to test.
