# Review: Orange token unification via var(--color-orange-500) — `b9edd7f`

**Date:** 2026-03-12
**Commits reviewed:** `b9edd7fe`
**Files reviewed:** `src/app/globals.css`, `DESIGN.md`

---

## Summary

Small, focused fix that replaces three hand-approximated OKLCH values with `var(--color-orange-500)`, guaranteeing the semantic tokens (`--primary`, `--accent`, `--ring`) match Tailwind's built-in orange-500 exactly. The approach is sound for Tailwind v4 — `@import "tailwindcss"` generates `--color-orange-500` as a top-level custom property before any `@layer` rules are evaluated, and CSS custom properties resolve lazily at computed-value time, so there is no ordering problem. The DESIGN.md updates are consistent with the CSS change.

The one concern is that the codebase still has numerous hardcoded `text-orange-500`, `bg-orange-500`, `hover:bg-orange-600`, `ring-orange-500`, and `accent-orange-500` references outside of `globals.css`. These all resolve to the same underlying Tailwind color, so there is no visual drift today. However, the stated goal of this commit is to unify the accent through semantic tokens, and those hardcodes bypass the token layer entirely. If the brand color ever changes, those locations would need manual updates.

---

## Critical Issues

None.

---

## Warnings

### Remaining hardcoded orange references bypass the semantic token layer
**Files:**
- `src/app/(app)/settings/_components/accounts-list.tsx:58` — `bg-orange-500 hover:bg-orange-600`
- `src/app/(app)/settings/_components/account-form.tsx:101` — `focus-visible:ring-orange-500`
- `src/app/(app)/settings/_components/account-form.tsx:217` — `accent-orange-500`
- `src/app/(app)/settings/_components/account-form.tsx:263` — `accent-orange-500`
- `src/app/(app)/settings/_components/account-form.tsx:323` — `bg-orange-500 hover:bg-orange-600`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:37` — `focus:ring-orange-500/50`
- `src/app/(app)/_components/sidebar.tsx:53,100,145,173` — `text-orange-500`

**Problem:** The commit message says it guarantees all orange usages "resolve to the exact same value with no drift." This is true today because `--color-orange-500` is the same value that `text-orange-500` and `bg-orange-500` resolve to. But the semantic tokens (`bg-primary`, `text-primary`, `ring-ring`) exist precisely so that a future brand color change requires editing one line in `globals.css` rather than a find-and-replace across a dozen files. These hardcoded references defeat that purpose.

**Fix:** In a follow-up commit, migrate the settings and gatekeeper files to use `bg-primary`, `text-primary`, `ring-ring` (or `ring-primary/50`) instead of direct orange utility classes. The sidebar is noted as "legacy zinc" in DESIGN.md, so migrating it is lower priority but should eventually happen too.

---

## Suggestions

### DESIGN.md "bg-accent" row says "same as primary" — state the actual value
**File:** `DESIGN.md:26`
**Note:** The row for `bg-accent` says the value is "same as primary" rather than `var(--color-orange-500)`. Now that both `--primary` and `--accent` reference the same CSS variable, it would be clearer to show the actual value in both rows for quick scanning.

---

## README

Does README.md need updating? **No.** This is a purely internal CSS token change with no impact on setup, architecture, environment variables, or user-facing behaviour.

---

## E2E tests to add

None. This is a visual consistency fix with no new user-visible flows, forms, or interactions.
