# Review: Gatekeeper spacing, unread border, and mobile button layout — `ec0afeb`

**Date:** 2026-03-14
**Commits reviewed:** `ec0afebc`
**Files reviewed:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`, `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx`, `DESIGN.md`

---

## Summary

A clean, well-scoped UI fix. The three changes (top bar height, border simplification, mobile button stacking) all address real problems and are implemented correctly. The `md:contents` technique for the button wrapper is a smart approach that avoids layout duplication. The DESIGN.md addition is a useful process improvement. Build passes without errors. No security, error handling, or i18n concerns.

---

## Critical Issues

None.

---

## Warnings

### Desktop buttons have no minimum height guarantee
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:335-342`
**Problem:** On desktop, the Approve/Block buttons use `md:min-h-0`, which means their height is entirely determined by `items-stretch` from the parent row. If a `GatekeeperCard` ever renders very short content (e.g. no snippet, short subject, single-line mobile layout), the buttons could become uncomfortably small. Currently this is unlikely because the card has `p-4` and multiple content rows, but it is fragile.
**Fix:** Use `md:min-h-9` (36px, the standard button height from DESIGN.md) instead of `md:min-h-0` on both buttons. This ensures a minimum even if the card shrinks.

### GatekeeperCard still has focus ring despite DESIGN.md suppression rule
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:50`
**Problem:** The card applies `focus-visible:ring-2 focus-visible:ring-primary/50`, but DESIGN.md states "Focus rings are suppressed globally" and "Do not add ring-* or outline-* focus styles to new components." This was carried over from the inbox card copy and was not introduced by this commit, but it is present in the reviewed file.
**Fix:** Remove `focus-visible:ring-2 focus-visible:ring-primary/50` from line 50. This is a pre-existing issue but worth noting since the file was touched.

---

## Suggestions

### `isRead` prop on `GatekeeperEmail` is vestigial
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:19`
**Note:** The `isRead` field is still part of the `GatekeeperEmail` type and is still used for conditional styling on sender name (line 69) and subject (lines 91-93), but all gatekeeper entries are always unread (`isRead: false` is hardcoded in `page.tsx`). After removing the border distinction in this commit, the remaining read/unread conditionals are dead code. Consider removing `isRead` from `GatekeeperEmail` and always using the unread styling.

### DESIGN.md gatekeeper row pattern is now stale
**File:** `DESIGN.md:149-163`
**Note:** The "Gatekeeper Row (legacy zinc style)" section describes the old `bg-zinc-900 rounded-lg border border-zinc-800/50` pattern with specific sizing (`h-1.5 w-1.5` dot, `h-8 w-8` avatar). The gatekeeper now uses the inbox card pattern (`bg-muted/70 border-2 rounded-xl p-4`, `h-9 w-9` avatar). This section should be updated or removed to avoid confusion.

---

## README

Does README.md need updating? No. This change is purely cosmetic UI adjustments and a DESIGN.md process addition. No setup, architecture, env var, or user-facing behaviour changes.

---

## E2E tests to add

None. These are visual/layout changes that do not alter user-facing flows, form behavior, or navigation. The existing gatekeeper approve/block flow (if tested) is unchanged.
