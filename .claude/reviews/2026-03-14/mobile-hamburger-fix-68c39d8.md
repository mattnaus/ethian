# Review: Fix duplicate hamburger on gatekeeper and improve icon visibility — `68c39d8`

**Date:** 2026-03-14
**Commits reviewed:** `68c39d8d`
**Files reviewed:** `src/app/(app)/_components/mobile-nav-context.tsx`

---

## Summary

Small, focused fix that addresses two clear bugs: a duplicate hamburger on the gatekeeper page and poor icon visibility. The implementation is correct and the build passes cleanly. One minor forward-looking concern about maintainability of the `hasOwnButton` pattern, and one potential gap for future gatekeeper sub-routes.

---

## Critical Issues

None.

---

## Warnings

### `hasOwnButton` does not cover potential gatekeeper sub-routes
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:109`
**Problem:** The inbox uses both `pathname === "/inbox"` and `pathname.startsWith("/inbox/")` to cover sub-routes like `/inbox/[emailId]`. The gatekeeper currently has no sub-routes, but if one is added later (e.g. `/gatekeeper/[senderId]`) and it embeds its own `MobileMenuButton`, the universal fixed button will render alongside it — the same bug this commit fixes. Using `pathname.startsWith("/gatekeeper")` would be more defensive.
**Fix:** Change `pathname === "/gatekeeper"` to `pathname === "/gatekeeper" || pathname.startsWith("/gatekeeper/")` to match the inbox pattern.

---

## Suggestions

### The `hasOwnButton` allowlist is fragile
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:106-109`
**Note:** Every page that embeds `MobileMenuButton` must also be manually added to `hasOwnButton`. This coupling will become a source of bugs as more pages get custom headers. A more robust approach would be to have `MobileMenuButton` signal its presence to the provider (e.g. via a ref or context flag set in `useEffect`) so the universal button auto-hides. Low priority since only two pages currently use it.

---

## README

Does README.md need updating? No. This is a minor UI fix with no impact on setup, architecture, or user-facing documentation.

---

## E2E tests to add

None. The duplicate hamburger and icon sizing are visual issues better verified manually or with visual regression tests than with Playwright functional tests. The existing nav drawer behavior is unchanged.
