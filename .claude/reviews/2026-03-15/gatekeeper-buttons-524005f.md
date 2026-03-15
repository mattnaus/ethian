# Review: Move approve/block buttons inside expanded gatekeeper card — `524005f`

**Date:** 2026-03-15
**Commits reviewed:** `524005f`
**Files reviewed:**
- `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`

---

## Summary

Clean, small change that moves the approve/block buttons inside the expanded card preview area and hides the external buttons when expanded. The approach is sound: an `actions` ReactNode prop on GatekeeperCard keeps the card component agnostic about what actions are rendered. Build passes. No security, error handling, or i18n issues. Two minor observations below.

---

## Critical Issues

None.

---

## Warnings

### Duplicated button markup
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:377-411`
**Problem:** The approve and block buttons are now defined twice — once as the `actions` prop (lines 377-393) and once as the external collapsed buttons (lines 396-411). The class names are nearly identical (the only difference is `md:flex-none md:min-h-0` on the collapsed variant). If button text, colors, icons, or click handlers change, both copies must be updated in sync.
**Fix:** Extract a helper function or small component (e.g. `DecisionButtons`) that accepts a `variant: "expanded" | "collapsed"` prop to toggle the minor class differences. This removes the duplication and the risk of the two copies drifting apart.

---

## Suggestions

### Event propagation on action buttons inside expanded card
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:198-202`
**Note:** The `actions` div sits inside the expanded preview area which already has `onClick={(e) => e.stopPropagation()}` (line 169), so clicks on the buttons will not bubble up to the card's `onToggleExpand` handler. This is correct. However, the `actions` container itself does not call `stopPropagation` — it relies on the parent preview div doing so. This is fine as-is but worth noting: if the `actions` div is ever moved outside the preview container, clicks on the buttons would toggle the card expansion.

---

## README

No. This change is purely visual/UX and does not affect setup, architecture, env vars, or documented behaviour.

---

## E2E tests to add

None. The existing gatekeeper flow (expand card, approve/block) is unchanged in behaviour — only the button placement moved. The existing e2e tests (if any cover gatekeeper decisions) will continue to work since the buttons still have the same text content for locator matching.
