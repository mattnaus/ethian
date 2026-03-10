# Review: Sidebar layout flash and redundant collapse button — `4a9de62`

**Date:** 2026-03-10
**Commits reviewed:** `4a9de628`
**Files reviewed:** `src/app/(app)/_components/sidebar.tsx`

---

## Summary

Clean, focused fix. The lazy `useState` initialiser eliminates the layout flash caused by the previous `useEffect` approach — the correct pattern for SSR-safe localStorage reads in a `"use client"` component. Removing the redundant collapse button from the nav body simplifies the UI and avoids two competing controls for the same action. Adding `type="button"` is a good defensive habit. No issues found.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### SSR guard may be unnecessary in `"use client"` component
**File:** `src/app/(app)/_components/sidebar.tsx:129`
**Note:** The `typeof window === "undefined"` guard in the lazy initialiser is harmless but likely unnecessary. Next.js `"use client"` components with `useState` lazy initialisers run client-side. The guard is fine as a safety net, but if it were ever hit during SSR it would cause a hydration mismatch anyway (server renders collapsed, client might render expanded). Not worth changing — just worth knowing.

---

## README

No. This change is an internal UI fix with no impact on setup, architecture, or user-facing documentation.

---

## E2E tests to add

None. The collapsible sidebar e2e spec already exists at `.claude/e2e_tests_to_make/collapsible-sidebar.md` and covers the toggle and persistence flows. This fix does not introduce new user-visible behaviour.
