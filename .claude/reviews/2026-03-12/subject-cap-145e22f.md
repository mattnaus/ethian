# Review: Subject 66% width cap — `145e22f`

**Date:** 2026-03-12
**Commits reviewed:** `145e22fb`
**Files reviewed:** `src/app/(app)/inbox/_components/email-card.tsx`

---

## Summary

Small, focused CSS-only change that replaces the previous single-truncate container with a two-span flex layout where the subject is capped at 66% and the snippet fills the rest. The approach is sound and solves the stated problem. One real layout issue with `shrink-0` conflicting with `max-w-[66%]` at narrow widths, and a minor mobile concern.

---

## Critical Issues

None.

---

## Warnings

### `shrink-0` prevents the subject from shrinking below its intrinsic width on very narrow containers
**File:** `src/app/(app)/inbox/_components/email-card.tsx:88`
**Problem:** The subject span has `shrink-0 truncate max-w-[66%]`. `shrink-0` sets `flex-shrink: 0`, meaning the element will never shrink below its content width even when the flex container is too narrow. If the subject text's intrinsic width is less than 66% of the container, this is fine — `max-w-[66%]` only caps, it does not force width. But if the overall flex container becomes very narrow (e.g. a small mobile screen with the card padded, or a narrow browser window between `md` and `lg` breakpoints where the sender column eats space), the subject will refuse to shrink and can overflow the container. `truncate` alone does not help because `shrink-0` prevents the element from ever reaching the size where text-overflow would kick in.

On mobile (< `md`) the snippet is hidden via `hidden md:inline`, so the subject is the only flex child. A single `shrink-0` child in a `min-w-0` flex container will overflow if its text is longer than the container. The `max-w-[66%]` caps it to 66%, but on a 320px-wide phone with padding, 66% of the remaining space may still be too wide if the text is long — though `truncate` should handle it since `max-w-[66%]` is a percentage and does resolve. This is a borderline case but worth verifying on a 320px viewport.

**Fix:** Replace `shrink-0` with `shrink min-w-0` (which is what the previous commit `a9d3b99` actually set). `shrink min-w-0` allows the element to shrink when the container demands it, while `max-w-[66%]` still caps the upper bound. The truncation will work correctly because `min-w-0` allows the element to shrink below its intrinsic size.

```diff
- "shrink-0 truncate max-w-[66%]",
+ "shrink min-w-0 truncate max-w-[66%]",
```

### Previous commit's fix was reverted
**File:** `src/app/(app)/inbox/_components/email-card.tsx:88`
**Problem:** Commit `a9d3b99` specifically changed the subject span from `shrink-0` to `shrink min-w-0` to fix fragility at narrow viewports (documented in the work log). This commit reintroduces `shrink-0`, effectively reverting that fix. The work log for `a9d3b99` explicitly notes this was a reviewer finding that was addressed. This suggests the regression was unintentional.
**Fix:** Same as above — use `shrink min-w-0` instead of `shrink-0`.

---

## Suggestions

### Mobile subject has no max-width cap
**File:** `src/app/(app)/inbox/_components/email-card.tsx:88`
**Note:** On mobile, the snippet span is `hidden`, so the subject is the sole child of the flex container. `max-w-[66%]` still applies, meaning the subject will never use more than 66% of the row width on mobile — even though there is no snippet competing for space. This wastes ~34% of the row. Consider using `max-w-[66%]` only on desktop: `max-w-full md:max-w-[66%]`. On mobile the snippet shows on a separate line (line 101), so the subject should be free to use the full width.

---

## README

Does README.md need updating? No. This is a CSS-only layout tweak to an existing component with no impact on setup, architecture, or user-facing behaviour beyond visual polish.

---

## E2E tests to add

None. This is a visual/CSS change that does not introduce new user-facing flows, form interactions, or routing. Visual regression testing would be more appropriate than e2e tests here.
