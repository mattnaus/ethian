# Review: Mailbox filter dropdown state split — `7f03519`

**Date:** 2026-03-12
**Commits reviewed:** `7f035195`
**Files reviewed:** `src/app/(app)/inbox/_components/inbox-view.tsx`

---

## Summary

Clean, minimal fix that correctly addresses the root cause. The diagnosis is accurate: Radix Popover instances with `open={true}` attach outside-click listeners even when CSS-hidden, so sharing a single boolean between the desktop and mobile Popovers caused mutual interference. Splitting into `filterOpenDesktop` / `filterOpenMobile` matches the v0 prototype and eliminates the problem. No regressions introduced.

The `folderOpen` state (line 205) does NOT have the same problem -- it is consumed by a single Popover instance (lines 401-424) that uses responsive Tailwind classes (`w-[calc(100vw-20px)] md:w-52`) to adapt between breakpoints rather than rendering two separate Popover components. No split is needed there.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

None.

---

## README

Does README.md need updating? No. This is a UI bug fix with no impact on setup, architecture, environment variables, or user-facing documentation.

---

## E2E tests to add

None. This is a Radix Popover interaction bug that is difficult to reproduce in Playwright (it depends on simultaneous open state across CSS-hidden DOM nodes and Radix's focus-trap timing). The fix is structurally obvious and low-risk.
