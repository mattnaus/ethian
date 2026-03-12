# Review: DESIGN.md stale orange-500 cleanup — `dcadb58`

**Date:** 2026-03-12
**Commits reviewed:** `dcadb58c`
**Files reviewed:** `DESIGN.md`

---

## Summary

Clean, scoped documentation fix. All four stale `orange-500` Tailwind utility references in DESIGN.md were replaced with their correct semantic token equivalents (`text-primary`, `focus:ring-ring/50`, `focus-visible:ring-ring`). The remaining `orange-500` occurrences (lines 24, 26, 46) are intentional -- they describe the underlying CSS variable value in the semantic token definition table and accent description section, not Tailwind classes for use in code. No `orange-600` references exist. The replacements are semantically accurate.

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

Does README.md need updating? No. This is a documentation-only change to an internal design reference file.

---

## E2E tests to add

None.
