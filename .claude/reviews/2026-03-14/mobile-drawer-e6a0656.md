# Review: Mobile hamburger drawer — `e6a0656`

**Date:** 2026-03-14
**Commits reviewed:** `e6a06568`
**Files reviewed:** `src/app/(app)/_components/mobile-nav-context.tsx`, `src/app/(app)/_components/sidebar.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`, `messages/en.json`, `src/app/(app)/gatekeeper/page.tsx`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/saved/page.tsx`, `src/app/(app)/sent/page.tsx`, `src/app/(app)/snoozed/page.tsx`, `src/app/(app)/trash/page.tsx`

---

## Summary

The implementation is clean and well-structured. The `MobileNavProvider` pattern with context is a good approach — it avoids prop-drilling and lets any page header opt into the hamburger button. Safe area handling on the drawer footer is correct. The drawer closes on link click, which is the right behavior. However, there are two significant gaps: most pages in the app now have no way to open the mobile nav (only inbox and email-detail got the hamburger button), and `DESIGN.md` is stale and still documents the old bottom tab bar pattern.

---

## Critical Issues

None.

---

## Warnings

### Pages without mobile navigation access
**File:** `src/app/(app)/gatekeeper/page.tsx`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/saved/page.tsx`, `src/app/(app)/sent/page.tsx`, `src/app/(app)/snoozed/page.tsx`, `src/app/(app)/trash/page.tsx`
**Problem:** The old bottom tab bar was global — it appeared on every page inside `(app)/`. The new hamburger button is only added to `inbox-view.tsx` and `email-detail-view.tsx`. A user who navigates to Gatekeeper, Settings, Saved, Snoozed, Sent, or Trash on mobile has no way to navigate elsewhere. They are stuck.
**Fix:** Add `MobileMenuButton` to the header of every page inside `(app)/`. For placeholder pages (saved, snoozed, sent, trash), this means converting them to include a header with the hamburger. For gatekeeper and settings, add it to their existing headers. Alternatively, add the hamburger to the app shell layout itself (e.g. a fixed top bar on mobile) so it is automatically present on all pages.

### DESIGN.md is stale — still documents bottom tab bar
**File:** `DESIGN.md:279-286`, `DESIGN.md:296`, `DESIGN.md:332-336`
**Problem:** `DESIGN.md` still references the old mobile bottom tab bar in multiple places: the app shell layout snippet (line 279: `pb-16 md:pb-0`), the sidebar section (line 296: "replaced by a fixed bottom tab bar"), and the mobile conventions section (lines 332-336: tab bar height, `pb-16` reservation, FAB `bottom-20` position). These are now incorrect and will mislead future development.
**Fix:** Update all references to describe the new hamburger drawer pattern: `MobileNavProvider` wrapping the app shell, `MobileMenuButton` in page headers, FAB at `bottom-6`, no `pb-16` reservation needed.

### CLAUDE.md app shell layout section is stale
**File:** `CLAUDE.md` (Mobile layout bullet under "App shell layout")
**Problem:** CLAUDE.md says "On small screens (< md), the sidebar is replaced by a fixed bottom tab bar (4 items: Inbox, Screener, Sent, Settings)." This is no longer accurate.
**Fix:** Update to describe the hamburger drawer pattern.

---

## Suggestions

### Drawer does not close on route change via browser back/forward
**File:** `src/app/(app)/_components/mobile-nav-context.tsx`
**Note:** The drawer closes when clicking a `DrawerNavItem` because each item calls `onClose` in its `onClick`. But if the user navigates via browser back/forward (or swipe gestures on mobile), the drawer state stays open because there is no `usePathname` listener to reset it. Consider adding a `useEffect` that calls `close()` whenever `pathname` changes, so the drawer always closes on navigation regardless of how it was triggered.

### Feed and Paper Trail missing from drawer nav
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:82-89`
**Note:** The drawer nav items list does not include Feed (`/feed`) or Paper Trail (`/paper-trail`). The desktop sidebar also omits them. This is consistent but worth noting — when those pages are built, they need to be added to both the drawer and the desktop sidebar nav items arrays.

### Compose bar may be obscured by iOS keyboard
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:393`
**Note:** On iOS Safari/standalone mode, the compose bar sits at the bottom of the flex layout. When the software keyboard opens, the viewport shrinks but the compose bar may not remain visible depending on how the flex container reacts. This is a known iOS WebKit behavior. Consider using `visualViewport` API or CSS `env(keyboard-inset-height)` (Safari 15.4+) to keep the compose bar above the keyboard. This is pre-existing and not introduced by this commit, but the removal of `pb-16` makes it more relevant since there is less bottom padding.

### Mobile FAB safe area
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:462`
**Note:** The compose FAB uses `fixed bottom-6 right-4`. On iPhones with a home indicator, `bottom-6` (24px) may overlap the home indicator bar. Consider using `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]` or a `pb-safe` utility to ensure the FAB clears the safe area.

---

## README

Does README.md need updating? No. The change is internal navigation UX and does not affect setup, architecture, env vars, or external-facing behavior.

---

## E2E tests to add

None. The existing navigation e2e tests should be updated if/when the missing-hamburger-on-other-pages issue is fixed, but no new user flows were introduced that warrant new test specs.
