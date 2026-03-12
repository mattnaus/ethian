# Review: Mailbox filter label brightness/size — `69136ec`

**Date:** 2026-03-12
**Commits reviewed:** `69136ec5`
**Files reviewed:** `src/app/(app)/inbox/_components/inbox-view.tsx`, `src/app/globals.css`

---

## Summary

A two-line cosmetic change that brightens the "Mailbox" filter label from the inherited `text-muted-foreground` to `text-foreground/70` and bumps the desktop size from `text-xs` to `text-sm`. The change is correct and achieves the stated goal. `--foreground` is `oklch(0.95 0 0)` (near-white) at 70% opacity, which is noticeably brighter than `--muted-foreground` at `oklch(0.55 0 0)`. Desktop and mobile now use identical label styling. No security, logic, or accessibility concerns.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### Desktop button already sets `text-sm` on the parent
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:294-296`
**Note:** The desktop `<button>` (line 294) already has `text-sm` in its class list. The inner `<span>` now also declares `text-sm`, which is redundant — it inherits the same size from the parent. Not harmful, but removing it from the span would be cleaner. The mobile button does not set a font size on the parent, so `text-sm` on the mobile span is correct.

---

## README

Does README.md need updating? No. This is a purely cosmetic tweak with no impact on setup, architecture, or user-facing behaviour beyond visual polish.

---

## E2E tests to add

None.
