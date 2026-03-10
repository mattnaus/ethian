# Review: Fix gatekeeper message count and keyboard focus — `43b93da`

**Date:** 2026-03-10
**Commits reviewed:** `43b93da`
**Files reviewed:**
- `src/app/(app)/gatekeeper/page.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
- `src/app/(app)/inbox/_components/email-row.tsx`

---

## Summary

Targeted fix that cleanly addresses both warnings from the `cdd4d46` card layout review: the missing `messageCount` display in the gatekeeper and the lack of keyboard focus on rows. The implementation is correct — the message count badge is well styled and only shown when count exceeds 1, and the focus ring follows the design system (orange-500). Both mobile and desktop breakpoints are handled for the badge. No security, error handling, or TypeScript issues.

---

## Critical Issues

None.

---

## Warnings

### Message count badge is rendered twice on desktop
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:65-68` and `:90-93`
**Problem:** On desktop (`>=md`), both the mobile content block badge (lines 65-68, inside the `md:hidden` wrapper) and the standalone desktop badge (lines 90-93, `hidden md:inline-flex`) are rendered in the DOM. The mobile one is hidden via the parent's `md:hidden` so it works correctly at runtime, but this means two identical badge elements exist in the markup for every row with count > 1. This is not a bug — it renders correctly — but it is redundant DOM that could confuse screen readers if they enumerate hidden elements.
**Fix:** No action required unless accessibility auditing flags it. This is the same pattern used for the attachment indicator and sender name, so it is consistent with the existing approach.

---

## Suggestions

### Add `role` attribute to focusable rows
**File:** `src/app/(app)/inbox/_components/email-row.tsx:25`, `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:32`
**Note:** The rows now have `tabIndex={0}` making them focusable, but they have no semantic `role`. Adding `role="listitem"` (with a corresponding `role="list"` on the parent container) would improve screen reader navigation. This can wait until the rows become interactive links/buttons for the detail view.

### Consider `focus-visible` instead of `focus`
**File:** `src/app/(app)/inbox/_components/email-row.tsx:31`, `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:38`
**Note:** `focus:ring-2` shows the focus ring on mouse click as well as keyboard Tab. Using `focus-visible:ring-2` instead would show the ring only on keyboard navigation, which is the typical UX expectation for non-input elements. Mouse users already get the hover state.

---

## README

Does README.md need updating? **No.** This is a minor UI fix with no impact on setup, env vars, or architecture.

---

## E2E tests to add

None. The message count badge and focus ring are visual/styling changes with no interactive behaviour to test at this stage.
