# Review: Mobile nav fixes (universal hamburger, close-on-navigate, stale docs) — `847b434e`

**Date:** 2026-03-14
**Commits reviewed:** `847b434e`
**Files reviewed:** `src/app/(app)/_components/mobile-nav-context.tsx`, `DESIGN.md`, `CLAUDE.md`

---

## Summary

Clean, focused fix that addresses three concrete warnings from the prior drawer review. The close-on-navigate behavior via `useEffect([pathname])` is correct and idiomatic. The universal hamburger button is well-placed with proper touch targets and `md:hidden` gating. The `hasOwnButton` allowlist approach is brittle but acceptable for the current page count. DESIGN.md and CLAUDE.md updates are accurate and consistent with the implementation. No security, IMAP, or error-handling concerns apply to this change.

---

## Critical Issues

None.

---

## Warnings

### `hasOwnButton` allowlist will silently break when new pages embed `MobileMenuButton`
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:106`
**Problem:** The list of pages that embed their own `MobileMenuButton` is hardcoded as `pathname === "/inbox" || pathname.startsWith("/inbox/")`. When a future page (e.g. gatekeeper detail view, compose) embeds `MobileMenuButton` in its header, the developer must remember to update this condition. If they forget, the page will render two hamburger buttons -- one from the page header and one from the provider.
**Fix:** Invert the pattern: instead of an allowlist in the provider, have pages that embed their own button signal this via context (e.g. a `setHasOwnButton(true)` effect in `MobileMenuButton` itself, with cleanup on unmount). This eliminates the need to maintain a manual list. Alternatively, add a code comment warning near `MobileMenuButton` export reminding developers to update `hasOwnButton`.

### Universal hamburger may overlap page content in top-right corner
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:118`
**Problem:** The button is `fixed top-1.5 right-1.5 z-30`. Pages without their own header (gatekeeper, settings, placeholder pages) may render content -- headings, buttons, or controls -- in the top-right area that the fixed button will cover. There is no reserved space or padding for this button in those pages' layouts. On pages with a `h-12` header bar, `top-1.5` (6px) places the button within the header area, which works. On pages without a header bar, it floats over content.
**Fix:** Verify each non-inbox page has a header bar with enough right padding to accommodate the button, or adjust the button position to a less likely collision point (e.g. inside the page header rather than overlaid). At minimum, audit the current placeholder pages to confirm no overlap.

---

## Suggestions

### Consider using a ref-based approach instead of `useEffect` for close-on-navigate
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:84-86`
**Note:** The current `useEffect` fires on every render where `pathname` changes, including the initial mount (which calls `setIsOpen(false)` unnecessarily on an already-false state). This is harmless but slightly wasteful. A `useRef` to track the previous pathname and only close when it actually changes from a non-null prior value would be marginally cleaner. Not worth changing -- just noting for completeness.

### `dividerBefore` is typed as an inline property without a type definition
**File:** `src/app/(app)/_components/mobile-nav-context.tsx:94`
**Note:** The `navItems` array includes `dividerBefore: true` on the gatekeeper entry, but the array is untyped (inferred). Adding an explicit type for the nav item shape would make the structure clearer and catch typos.

---

## README

Does README.md need updating? No. This change is internal UI behavior (mobile nav mechanics) and documentation updates to DESIGN.md/CLAUDE.md. No new env vars, setup steps, or architecture changes.

---

## E2E tests to add

None. The mobile drawer open/close behavior is a client-side interaction detail. Playwright e2e tests for mobile navigation (hamburger tap opens drawer, nav link navigates and closes drawer) would be valuable but are not specifically warranted by this incremental fix -- they should be part of a broader mobile nav test suite if one is planned.
