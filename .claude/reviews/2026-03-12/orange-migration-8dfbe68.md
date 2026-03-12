# Review: Orange-to-semantic-token migration — `8dfbe68`

**Date:** 2026-03-12
**Commits reviewed:** `8dfbe68`
**Files reviewed:** `src/app/(app)/_components/sidebar.tsx`, `src/app/(app)/settings/_components/account-form.tsx`, `src/app/(app)/settings/_components/accounts-list.tsx`, `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`, `src/app/(app)/inbox/_components/email-card.tsx`, `DESIGN.md`, `src/app/globals.css`

---

## Summary

Clean migration of 11 hardcoded `orange-500`/`orange-600` references to semantic tokens (`text-primary`, `bg-primary`, `hover:bg-primary/90`, `focus-visible:ring-ring`, `focus:ring-ring/50`). The email card subject fix (`shrink min-w-0 max-w-full md:max-w-[66%]`) is correct and addresses both the mobile full-width need and desktop truncation. The `accent-primary` utility works in Tailwind v4 because `primary` is registered as a color via `--color-primary` in the `@theme inline` block. One warning: DESIGN.md was only partially updated and still contains stale hardcoded orange references that now contradict the code.

---

## Critical Issues

None.

---

## Warnings

### DESIGN.md still references hardcoded orange in multiple places
**File:** `DESIGN.md:41,159,255,297`
**Problem:** The commit updated only line 26 (`bg-accent` row) in DESIGN.md. Four other locations still reference hardcoded `orange-500`/`orange-600` as the canonical pattern:
- Line 41: `text-orange-500` listed in the legacy zinc table as "Active nav item, brand accent" -- the sidebar code now uses `text-primary`.
- Line 159: Gatekeeper row focus pattern documented as `focus:ring-2 focus:ring-orange-500/50` -- the code now uses `focus:ring-ring/50`.
- Line 255: Dialog input pattern documented as `focus-visible:ring-orange-500` -- the code now uses `focus-visible:ring-ring`.
- Line 297: Nav item active state documented as `text-orange-500` -- the code now uses `text-primary`.

These stale references will mislead anyone reading DESIGN.md into reintroducing hardcoded orange classes.
**Fix:** Update all four locations to match the code:
- Line 41: change `text-orange-500` to `text-primary`
- Line 159: change `focus:ring-orange-500/50` to `focus:ring-ring/50`
- Line 255: change `focus-visible:ring-orange-500` to `focus-visible:ring-ring`
- Line 297: change `text-orange-500` to `text-primary`

---

## Suggestions

### Subject max-width of 66% is arbitrary -- consider a proportional approach
**File:** `src/app/(app)/inbox/_components/email-card.tsx:88`
**Note:** `max-w-full md:max-w-[66%]` works but the magic number `66%` has no clear basis. If the snippet is short or absent, the subject truncates unnecessarily. A `flex-shrink` based approach (e.g. `shrink` on the subject and `flex-1 min-w-0` on the snippet, which is already present) would let the browser allocate space proportionally. This is not a bug -- the current behavior is reasonable -- but worth considering if truncation complaints come up.

---

## README

Does README.md need updating? No. This is a purely cosmetic CSS token migration with no impact on setup, architecture, environment variables, or user-facing behavior.

---

## E2E tests to add

None. This change is a CSS class rename with no new user-visible flows, forms, or error states.
